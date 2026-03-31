import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { randomUUID } from 'crypto'
import path from 'path'
import { spawn } from 'child_process'
import ensure from '../scripts/dbEnsure.js'
// Note: `ioredis` is imported dynamically below so the server can run without it installed.
import { PrismaClient } from '@prisma/client'

dotenv.config()
const app = express()
// Debug endpoint: returns the constructed Discord authorize URL for troubleshooting
app.get('/api/auth/debug-url', (req, res) => {
  const redirectUri = encodeURIComponent(`${process.env.BASE_URL || `http://localhost:${PORT}`}/api/auth/discord/callback`)
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify`
  res.json({ url })
})
const prisma = new PrismaClient()
const PORT = process.env.PORT || 4000
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me'
const isProd = process.env.NODE_ENV === 'production'

app.use(cors({ origin: CLIENT_URL, credentials: true }))
app.use(express.json())

// Initialize session store with PG-backed store in production, fallback to in-memory in dev
let sessionStore
try {
  const PgSession = connectPgSimple(session)
  if (process.env.DATABASE_URL) {
    sessionStore = new PgSession({ conString: process.env.DATABASE_URL, ttl: 7 * 24 * 60 * 60, pruneSessionInterval: 24 * 60 * 60, createTableIfMissing: true })
  } else {
    console.warn('[start] No DATABASE_URL configured — using in-memory session store (dev only)')
    sessionStore = new session.MemoryStore()
  }
} catch (e) {
  console.warn('[start] Failed to initialize PG session store, falling back to MemoryStore', e && e.message ? e.message : e)
  sessionStore = new session.MemoryStore()
}

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, secure: isProd, sameSite: 'lax' }
}))

// Simple auth middleware for routes that require a logged-in user
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next()
  return res.status(401).json({ error: 'Not authenticated' })
}

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Readiness flag: false until DB ensure completes successfully
let dbReady = false

// Run dbEnsure in a non-blocking background child to avoid blocking server startup
function runDbEnsureBackground() {
  try {
    console.log('[start] Spawning dbEnsure background process...')
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'dbEnsure.js')
    const child = spawn(process.execPath, [scriptPath], { stdio: 'inherit', env: { ...process.env, CI: 'true' } })
    child.on('close', (code) => {
      if (code === 0) {
        dbReady = true
        console.log('[start] dbEnsure background exited successfully; server marked as ready.')
      } else {
        console.error(`[start] dbEnsure background exited with code ${code}; server will remain unhealthy.`)
      }
    })
    child.on('error', (err) => console.error('[start] Failed to spawn dbEnsure background', err && err.message ? err.message : err))
    child.unref()
  } catch (e) {
    console.error('[start] Error while starting dbEnsure background', e && e.message ? e.message : e)
  }
}

// Start dbEnsure in background
runDbEnsureBackground()

// Also probe DB directly so we can mark readiness if tables already exist
async function probeDbReady() {
  try {
    const needed = ['User', 'Command']
    const rows = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY(${needed})
    `
    const existing = rows.map(r => (r.table_name || r.tableName || '').toString())
    const missing = needed.filter(n => !existing.includes(n))
    if (missing.length === 0) {
      dbReady = true
      console.log('[start] DB probe: required tables exist; server marked ready.')
    } else {
      console.log('[start] DB probe: still missing tables:', missing.join(', '))
    }
  } catch (e) {
    console.warn('[start] DB probe failed:', e && e.message ? e.message : e)
  }
}

// Probe immediately and every 2 seconds until ready
probeDbReady()
const _probeInterval = setInterval(async () => {
  if (dbReady) return clearInterval(_probeInterval)
  await probeDbReady()
}, 2000)

// readiness endpoint for external health checks
app.get('/ready', (req, res) => {
  if (dbReady) return res.json({ ok: true })
  return res.status(503).json({ ok: false, reason: 'db_not_ready' })
})

// Duplicate readiness under /api/ready to work with dev proxy (vite)
app.get('/api/ready', (req, res) => {
  if (dbReady) return res.json({ ok: true })
  return res.status(503).json({ ok: false, reason: 'db_not_ready' })
})

// middleware to block DB-dependent routes until ready
function requireDbReady(req, res, next) {
  if (dbReady) return next()
  return res.status(503).json({ error: 'Service not ready' })
}

// Start Discord OAuth: redirect user to Discord's authorize URL
// Allow starting the OAuth redirect even if DB isn't ready yet
app.get('/api/auth/discord', (req, res) => {
  const redirectUri = encodeURIComponent(`${process.env.BASE_URL || `http://localhost:${PORT}`}/api/auth/discord/callback`)
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify`
  console.log('[auth] /api/auth/discord requested; redirecting to:', url)
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) console.warn('[auth] Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET in env')
  try {
    res.redirect(url)
  } catch (e) {
    console.error('[auth] Failed to send redirect:', e && e.message ? e.message : e)
    res.status(500).send('Failed to redirect to Discord')
  }
})

// OAuth callback: exchange code for token, fetch user, store pending auth token, redirect to client
// This accepts the request even if DB isn't ready; final user creation happens on /api/auth/complete
// Pending auth storage: prefer Redis if REDIS_URL is set, otherwise fallback to in-memory Map
const pendingAuthMap = new Map()
let redisClient = null
async function initRedis() {
  if (!process.env.REDIS_URL) return
  try {
    const mod = await import('ioredis')
    const IORedis = mod.default || mod
    redisClient = new IORedis(process.env.REDIS_URL)
    redisClient.on('error', (e) => console.warn('Redis error:', e && e.message ? e.message : e))
    console.log('[start] Connected to Redis for pending auth storage')
  } catch (e) {
    console.warn('[start] Failed to connect to Redis, falling back to in-memory pending map', e && e.message ? e.message : e)
    redisClient = null
  }
}

initRedis().catch(e => console.warn('initRedis error:', e && e.message ? e.message : e))

const PENDING_PREFIX = 'pending:'
async function setPending(token, data, ttl = 600) {
  if (redisClient) {
    await redisClient.set(PENDING_PREFIX + token, JSON.stringify(data), 'EX', ttl)
  } else {
    pendingAuthMap.set(token, data)
  }
}
async function getPending(token) {
  if (redisClient) {
    const v = await redisClient.get(PENDING_PREFIX + token)
    return v ? JSON.parse(v) : null
  } else {
    return pendingAuthMap.get(token) || null
  }
}
async function deletePending(token) {
  if (redisClient) {
    await redisClient.del(PENDING_PREFIX + token)
  } else {
    pendingAuthMap.delete(token)
  }
}
app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const { code } = req.query
    console.log('[auth] /api/auth/discord/callback hit with code:', code ? '[present]' : '[missing]')
    if (!code) return res.status(400).send('Missing code')

    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: `${process.env.BASE_URL || `http://localhost:${PORT}`}/api/auth/discord/callback`,
      }),
    })

    if (!tokenResp.ok) {
      const txt = await tokenResp.text()
      console.error('[auth] Token exchange failed', txt)
      return res.status(500).send('Token exchange failed')
    }

    const tokenData = await tokenResp.json()
    const accessToken = tokenData.access_token

    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!userResp.ok) {
      const txt = await userResp.text()
      console.error('Fetching user failed', txt)
      return res.status(500).send('Failed to fetch user')
    }

    const discordUser = await userResp.json()
    const discordId = discordUser.id
    const username = `${discordUser.username}#${discordUser.discriminator}`
    const avatar = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : null

    // Store discord user data in pending map and redirect client with token
    const token = randomUUID()
    await setPending(token, { discordId, username, avatar, createdAt: Date.now() })
    const redirectTo = `${CLIENT_URL}?pendingToken=${encodeURIComponent(token)}`
    console.log('[auth] Stored pending token, redirecting client to:', redirectTo)
    res.redirect(redirectTo)
  } catch (err) {
    console.error(err)
    res.status(500).send('OAuth error')
  }
})

// Complete pending auth: called by client after redirect to exchange pending token for session
app.get('/api/auth/complete', async (req, res) => {
  try {
    const { token } = req.query
    console.log('[auth] /api/auth/complete called with token present?', !!token)
    if (!token) return res.status(400).json({ error: 'Missing token' })
    const pending = await getPending(String(token))
    if (!pending) return res.status(404).json({ status: 'pending_not_found' })

    // Try to create/upsert user now
    try {
      let user
      try {
        user = await prisma.user.upsert({
          where: { id: pending.discordId },
          create: { id: pending.discordId, username: pending.username, avatar: pending.avatar },
          update: { username: pending.username, avatar: pending.avatar },
        })
      } catch (e) {
        const msg = e && e.message ? String(e.message) : ''
        if (msg.includes('Unknown argument `avatar`') || msg.includes('Unknown arg') || msg.includes('avatar')) {
          user = await prisma.user.upsert({
            where: { id: pending.discordId },
            create: { id: pending.discordId, username: pending.username },
            update: { username: pending.username },
          })
        } else {
          throw e
        }
      }

      // create session for this request
        req.session.user = { id: user.id, username: user.username, avatar: user.avatar }
      req.session.save(async (err) => {
        if (err) {
          console.error('session save error', err)
          return res.status(500).json({ error: 'failed_to_save_session' })
        }
        await deletePending(String(token))
        return res.json({ ok: true, user: { id: user.id, username: user.username, avatar: user.avatar } })
      })
    } catch (e) {
      // If DB not ready, return 202 to indicate pending
      console.warn('auth complete error (likely DB not ready):', e && e.message ? e.message : e)
      return res.status(202).json({ status: 'pending' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server_error' })
  }
})

// Return current authenticated user based on JWT cookie
app.get('/api/me', requireDbReady, async (req, res) => {
  try {
    const s = req.session && req.session.user
    if (!s) return res.status(401).json({ error: 'Not authenticated' })
    const user = await prisma.user.findUnique({ where: { id: s.id } })
    if (!user) return res.status(401).json({ error: 'Invalid user' })
    res.json({ id: user.id, username: user.username, avatar: user.avatar })
  } catch (err) {
    console.error('me error', err)
    res.status(401).json({ error: 'Not authenticated' })
  }
})

// Logout: clear the token cookie
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('logout destroy error', err)
      return res.status(500).json({ error: 'Failed to logout' })
    }
    res.clearCookie('connect.sid')
    res.json({ ok: true })
  })
})

app.get('/api/commands', requireDbReady, async (req, res) => {
  const cmds = await prisma.command.findMany({ include: { author: true } })
  res.json(cmds)
})

app.get('/api/commands/:id', requireDbReady, async (req, res) => {
  const { id } = req.params
  const cmd = await prisma.command.findUnique({ where: { id }, include: { author: true } })
  if (!cmd) return res.status(404).json({ error: 'Not found' })
  res.json(cmd)
})

app.post('/api/commands', requireDbReady, requireAuth, async (req, res) => {
  try {
    const data = req.body
    // Use session user as authorId and ignore any client-supplied authorId
    const authorId = req.session.user.id
    const cmd = await prisma.command.create({ data: { ...data, authorId } })
    res.status(201).json(cmd)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Start server immediately; dbEnsure runs in background (db-dependent routes will return 503 until ready)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
