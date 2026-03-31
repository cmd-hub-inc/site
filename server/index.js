import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { PrismaClient } from '@prisma/client'

dotenv.config()
const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 4000
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me'
const isProd = process.env.NODE_ENV === 'production'

app.use(cors({ origin: CLIENT_URL, credentials: true }))
app.use(express.json())

const PgSession = connectPgSimple(session)
app.use(session({
  store: new PgSession({ conString: process.env.DATABASE_URL, ttl: 7 * 24 * 60 * 60, pruneSessionInterval: 24 * 60 * 60 }),
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

// Start Discord OAuth: redirect user to Discord's authorize URL
app.get('/api/auth/discord', (req, res) => {
  const redirectUri = encodeURIComponent(`${process.env.BASE_URL || `http://localhost:${PORT}`}/api/auth/discord/callback`)
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify`
  res.redirect(url)
})

// OAuth callback: exchange code for token, fetch user, upsert in DB, redirect to client
app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const { code } = req.query
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
      console.error('Token exchange failed', txt)
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

    // Upsert user in DB using discord id as primary key, persist avatar
    const user = await prisma.user.upsert({
      where: { id: discordId },
      create: { id: discordId, username, avatar },
      update: { username, avatar },
    })

    // Store user in session and redirect back to client
    req.session.user = { id: user.id, username: user.username, avatar: user.avatar }
    req.session.save(err => {
      if (err) console.error('session save error', err)
      res.redirect(CLIENT_URL)
    })
  } catch (err) {
    console.error(err)
    res.status(500).send('OAuth error')
  }
})

// Return current authenticated user based on JWT cookie
app.get('/api/me', async (req, res) => {
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

app.get('/api/commands', async (req, res) => {
  const cmds = await prisma.command.findMany({ include: { author: true } })
  res.json(cmds)
})

app.get('/api/commands/:id', async (req, res) => {
  const { id } = req.params
  const cmd = await prisma.command.findUnique({ where: { id }, include: { author: true } })
  if (!cmd) return res.status(404).json({ error: 'Not found' })
  res.json(cmd)
})

app.post('/api/commands', requireAuth, async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
