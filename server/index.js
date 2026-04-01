import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { randomUUID } from 'crypto';
import path from 'path';
import { spawn } from 'child_process';
import ensure from '../scripts/dbEnsure.js';
// Note: `ioredis` is imported dynamically below so the server can run without it installed.
import { PrismaClient } from '@prisma/client';
import { expressLoggingMiddleware, logError } from '../api_handlers/_lib/logger.js';
import { rateLimiters } from '../api_handlers/_lib/rateLimiter.js';
import { scheduleAnalyticsFlush } from '../api_handlers/_lib/analytics.js';
import { scheduleTrendingComputation } from '../api_handlers/trending.js';
import { verifyToken } from '../api_handlers/_lib/jwt.js';

dotenv.config();
const app = express();
// Debug endpoint: returns the constructed Discord authorize URL for troubleshooting
app.get('/api/auth/debug-url', (req, res) => {
  const redirectUri = encodeURIComponent(
    `${process.env.BASE_URL || `http://localhost:${PORT}`}/api/auth/discord/callback`,
  );
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
  res.json({ url });
});
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';
const isProd = process.env.NODE_ENV === 'production';

// Configure CORS to allow multiple frontends and echo the request origin
const allowedOrigins = [
  CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser requests (e.g. curl, server-to-server) when origin is undefined
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json());

// Add request logging middleware
app.use(expressLoggingMiddleware);

// Add rate limiting middleware to API routes
app.use('/api/', rateLimiters.api);
app.use('/api/commands', rateLimiters.read);
app.use('/api/favorites', rateLimiters.api);
app.use('/api/users/:id/follow', rateLimiters.api);
app.use('/api/commands/*/rate', rateLimiters.rating);

// Initialize session store with PG-backed store in production, fallback to in-memory in dev
let sessionStore;
try {
  const PgSession = connectPgSimple(session);
  if (process.env.DATABASE_URL) {
    sessionStore = new PgSession({
      conString: process.env.DATABASE_URL,
      ttl: 7 * 24 * 60 * 60,
      pruneSessionInterval: 24 * 60 * 60,
      createTableIfMissing: true,
    });
  } else {
    console.warn('[start] No DATABASE_URL configured — using in-memory session store (dev only)');
    sessionStore = new session.MemoryStore();
  }
} catch (e) {
  console.warn(
    '[start] Failed to initialize PG session store, falling back to MemoryStore',
    e && e.message ? e.message : e,
  );
  sessionStore = new session.MemoryStore();
}

app.use(
  session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, secure: isProd, sameSite: 'lax' },
  }),
);

// Simple auth middleware for routes that require a logged-in user
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Readiness flag: false until DB ensure completes successfully
let dbReady = false;

// Run dbEnsure in a non-blocking background child to avoid blocking server startup
function runDbEnsureBackground() {
  try {
    console.log('[start] Spawning dbEnsure background process...');
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'dbEnsure.js');
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' },
    });
    child.on('close', (code) => {
      if (code === 0) {
        dbReady = true;
        console.log('[start] dbEnsure background exited successfully; server marked as ready.');
      } else {
        console.error(
          `[start] dbEnsure background exited with code ${code}; server will remain unhealthy.`,
        );
      }
    });
    child.on('error', (err) =>
      console.error(
        '[start] Failed to spawn dbEnsure background',
        err && err.message ? err.message : err,
      ),
    );
    child.unref();
  } catch (e) {
    console.error(
      '[start] Error while starting dbEnsure background',
      e && e.message ? e.message : e,
    );
  }
}

// Start dbEnsure in background
runDbEnsureBackground();

// Also probe DB directly so we can mark readiness if tables already exist
async function probeDbReady() {
  try {
    const needed = ['User', 'Command'];
    const rows = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY(${needed})
    `;
    const existing = rows.map((r) => (r.table_name || r.tableName || '').toString());
    const missing = needed.filter((n) => !existing.includes(n));
    if (missing.length === 0) {
      dbReady = true;
      console.log('[start] DB probe: required tables exist; server marked ready.');
    } else {
      console.log('[start] DB probe: still missing tables:', missing.join(', '));
    }
  } catch (e) {
    console.warn('[start] DB probe failed:', e && e.message ? e.message : e);
  }
}

// Probe immediately and every 2 seconds until ready
probeDbReady();
const _probeInterval = setInterval(async () => {
  if (dbReady) return clearInterval(_probeInterval);
  await probeDbReady();
}, 2000);

// readiness endpoint for external health checks
app.get('/ready', (req, res) => {
  if (dbReady) return res.json({ ok: true });
  return res.status(503).json({ ok: false, reason: 'db_not_ready' });
});

// Duplicate readiness under /api/ready to work with dev proxy (vite)
app.get('/api/ready', (req, res) => {
  if (dbReady) return res.json({ ok: true });
  return res.status(503).json({ ok: false, reason: 'db_not_ready' });
});

// middleware to block DB-dependent routes until ready
function requireDbReady(req, res, next) {
  if (dbReady) return next();
  return res.status(503).json({ error: 'Service not ready' });
}

// Start Discord OAuth: redirect user to Discord's authorize URL
// Allow starting the OAuth redirect even if DB isn't ready yet
app.get('/api/auth/discord', (req, res) => {
  const redirectUri = encodeURIComponent(
    `${process.env.BASE_URL || `http://localhost:${PORT}`}/api/auth/discord/callback`,
  );
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
  console.log('[auth] /api/auth/discord requested; redirecting to:', url);
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET)
    console.warn('[auth] Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET in env');
  try {
    res.redirect(url);
  } catch (e) {
    console.error('[auth] Failed to send redirect:', e && e.message ? e.message : e);
    res.status(500).send('Failed to redirect to Discord');
  }
});

// OAuth callback: exchange code for token, fetch user, store pending auth token, redirect to client
// This accepts the request even if DB isn't ready; final user creation happens on /api/auth/complete
// Pending auth storage: prefer Redis if REDIS_URL is set, otherwise fallback to in-memory Map
const pendingAuthMap = new Map();
let redisClient = null;
async function initRedis() {
  if (!process.env.REDIS_URL) return;
  try {
    const mod = await import('ioredis');
    const IORedis = mod.default || mod;
    redisClient = new IORedis(process.env.REDIS_URL);
    redisClient.on('error', (e) => console.warn('Redis error:', e && e.message ? e.message : e));
    console.log('[start] Connected to Redis for pending auth storage');
  } catch (e) {
    console.warn(
      '[start] Failed to connect to Redis, falling back to in-memory pending map',
      e && e.message ? e.message : e,
    );
    redisClient = null;
  }
}

initRedis().catch((e) => console.warn('initRedis error:', e && e.message ? e.message : e));

const PENDING_PREFIX = 'pending:';
async function setPending(token, data, ttl = 600) {
  try {
    const dataWithExpiry = { ...data, expiresAt: Date.now() + (ttl * 1000) };
    if (redisClient) {
      await redisClient.set(PENDING_PREFIX + token, JSON.stringify(dataWithExpiry), 'EX', ttl);
      console.log('[auth] Token stored in Redis:', token, 'TTL:', ttl);
    } else {
      pendingAuthMap.set(token, dataWithExpiry);
      console.log('[auth] Token stored in memory map:', token, 'Map size:', pendingAuthMap.size);
    }
  } catch (e) {
    console.error('[auth] Error storing pending token:', e && e.message ? e.message : e);
    // Fallback to in-memory if Redis fails
    if (!redisClient) {
      pendingAuthMap.set(token, { ...data, expiresAt: Date.now() + 600000 });
    }
  }
}
async function getPending(token) {
  try {
    if (redisClient) {
      const v = await redisClient.get(PENDING_PREFIX + token);
      if (!v) return null;
      const parsed = JSON.parse(v);
      // Check expiration
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
        await redisClient.del(PENDING_PREFIX + token);
        return null;
      }
      return parsed;
    } else {
      const v = pendingAuthMap.get(token);
      if (!v) {
        console.log('[auth] getPending from map, found: false Map size:', pendingAuthMap.size);
        return null;
      }
      // Check expiration
      if (v.expiresAt && v.expiresAt < Date.now()) {
        pendingAuthMap.delete(token);
        console.log('[auth] Token expired:', token);
        return null;
      }
      console.log('[auth] getPending from map, found: true Map size:', pendingAuthMap.size);
      return v;
    }
  } catch (e) {
    console.error('[auth] Error getting pending token:', e && e.message ? e.message : e);
    return null;
  }
}
async function deletePending(token) {
  try {
    if (redisClient) {
      await redisClient.del(PENDING_PREFIX + token);
      console.log('[auth] Deleted pending token from Redis:', token);
    } else {
      pendingAuthMap.delete(token);
      console.log('[auth] Deleted pending token from map:', token, 'Map size:', pendingAuthMap.size);
    }
  } catch (e) {
    console.error('[auth] Error deleting pending token:', e && e.message ? e.message : e);
  }
}
app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const { code } = req.query;
    console.log(
      '[auth] /api/auth/discord/callback hit with code:',
      code ? '[present]' : '[missing]',
    );
    if (!code) return res.status(400).send('Missing code');

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
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.error('[auth] Token exchange failed', txt);
      return res.status(500).send('Token exchange failed');
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResp.ok) {
      const txt = await userResp.text();
      console.error('Fetching user failed', txt);
      return res.status(500).send('Failed to fetch user');
    }

    const discordUser = await userResp.json();
    const discordId = discordUser.id;
    // Discord removed discriminators for many users — avoid showing '#0'
    const username =
      discordUser.discriminator && discordUser.discriminator !== '0'
        ? `${discordUser.username}#${discordUser.discriminator}`
        : discordUser.username;
    const avatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
      : null;

    // Store discord user data in pending map and redirect client with token
    const token = randomUUID();
    console.log('[auth] Generated token for Discord user', discordId, ':', token);
    await setPending(token, { discordId, username, avatar, createdAt: Date.now() });
    const redirectTo = `${CLIENT_URL}?pendingToken=${encodeURIComponent(token)}`;
    console.log('[auth] Stored pending token, redirecting client to:', redirectTo);
    res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    res.status(500).send('OAuth error');
  }
});

// Complete pending auth: called by client after redirect to exchange pending token for session
app.get('/api/auth/complete', async (req, res) => {
  try {
    const { token } = req.query;
    console.log('[auth] /api/auth/complete called with token present?', !!token);
    if (!token) return res.status(400).json({ error: 'Missing token' });
    
    let pending = await getPending(String(token));
    
    // If token not found in map/Redis, try to verify as JWT
    if (!pending) {
      console.log('[auth] Token not found in map, trying JWT verification...');
      pending = verifyToken(String(token));
      if (pending) {
        console.log('[auth] Token verified as JWT');
      }
    }
    
    console.log('[auth] getPending result:', !!pending);
    if (!pending) {
      console.warn('[auth] Token not found or expired:', token);
      return res.status(404).json({ status: 'pending_not_found', detail: 'Token not found or expired' });
    }

    // Try to create/upsert user now
    try {
      let user;
      try {
        user = await prisma.user.upsert({
          where: { id: pending.discordId },
          create: { id: pending.discordId, username: pending.username, avatar: pending.avatar },
          update: { username: pending.username, avatar: pending.avatar },
        });
      } catch (e) {
        const msg = e && e.message ? String(e.message) : '';
        if (
          msg.includes('Unknown argument `avatar`') ||
          msg.includes('Unknown arg') ||
          msg.includes('avatar')
        ) {
          user = await prisma.user.upsert({
            where: { id: pending.discordId },
            create: { id: pending.discordId, username: pending.username },
            update: { username: pending.username },
          });
        } else {
          throw e;
        }
      }

      // Check for admin status from environment or database
      let isAdmin = false;
      let adminRole = null;
      const adminList = (process.env.ADMIN_IDS || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      
      // Check if user is in ADMIN_IDS env var
      if (adminList.includes(String(user.id))) {
        isAdmin = true;
        adminRole = 'SUPER_ADMIN';
        // Also save to database
        try {
          await prisma.$executeRawUnsafe(`
            UPDATE "User"
            SET "isAdmin" = true, "adminRole" = 'SUPER_ADMIN'
            WHERE id = $1
          `, user.id);
        } catch (dbErr) {
          // Ignore DB update errors, just continue
        }
      } else if (user.isAdmin) {
        // User already has admin status in database
        isAdmin = true;
        adminRole = user.adminRole || 'SUPER_ADMIN';
      }

      req.session.user = { id: user.id, username: user.username, avatar: user.avatar, isAdmin, adminRole };
      req.session.save(async (err) => {
        if (err) {
          console.error('session save error', err);
          return res.status(500).json({ error: 'failed_to_save_session' });
        }
        try {
          await deletePending(String(token));
        } catch (delErr) {
          console.warn('[auth] Failed to delete pending token:', delErr && delErr.message ? delErr.message : delErr);
        }
        return res.json({
          ok: true,
          user: { id: user.id, username: user.username, avatar: user.avatar, isAdmin, adminRole },
        });
      });
    } catch (e) {
      // If DB not ready, return 202 to indicate pending
      console.warn('auth complete error (likely DB not ready):', e && e.message ? e.message : e);
      return res.status(202).json({ status: 'pending' });
    }
  } catch (err) {
    console.error('[auth] auth/complete error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Return current authenticated user based on JWT cookie
app.get('/api/me', requireDbReady, async (req, res) => {
  try {
    const s = req.session && req.session.user;
    if (!s) return res.json({ user: null });
    
    try {
      const user = await prisma.user.findUnique({ where: { id: s.id } });
      if (user) {
        return res.json({
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            isAdmin: user.isAdmin || false,
            adminRole: user.adminRole || null
          },
          isAdmin: user.isAdmin || false,
        });
      }
      // Fallback to session user if DB query fails
      return res.json({
        user: {
          ...s,
          isAdmin: s.isAdmin || false,
          adminRole: s.adminRole || null
        },
        isAdmin: s.isAdmin || false
      });
    } catch (e) {
      return res.json({
        user: {
          ...s,
          isAdmin: s.isAdmin || false,
          adminRole: s.adminRole || null
        },
        isAdmin: s.isAdmin || false
      });
    }
  } catch (err) {
    console.error('me endpoint error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Logout endpoint: destroys session
app.post('/api/logout', async (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.warn('session destroy error', err && err.message ? err.message : err);
        }
      });
    }
    // Clear cookie
    try {
      res.clearCookie && res.clearCookie('connect.sid');
    } catch (e) {}
    return res.json({ ok: true });
  } catch (err) {
    console.error('logout error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});
app.get('/api/commands', requireDbReady, async (req, res) => {
  try {
    try {
      const cmds = await prisma.command.findMany({ include: { author: true } });
      const ids = cmds.map((c) => c.id).filter(Boolean);
      if (ids.length > 0) {
        const rows = await prisma.$queryRaw`
          SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
        `;
        const map = {};
        if (Array.isArray(rows))
          rows.forEach(
            (r) =>
              (map[r.id || r.ID || Object.values(r)[0]] =
                r.uploadCategory || r.uploadcategory || r.UploadCategory),
          );
        const out = cmds.map((c) => ({ ...c, uploadCategory: map[c.id] || 'Framework' }));
        return res.json(out);
      }
      return res.json(cmds);
    } catch (prismaErr) {
      console.warn(
        '[api] Prisma findMany failed, falling back to raw SQL:',
        prismaErr && prismaErr.message ? prismaErr.message : prismaErr,
      );
      try {
        const rows = await prisma.$queryRaw`
          SELECT c.*, u.id as author_id, u.username as author_username, u.avatar as author_avatar
          FROM "Command" c
          LEFT JOIN "User" u ON c."authorId" = u.id
          ORDER BY c."createdAt" DESC
        `;
        const out = (Array.isArray(rows) ? rows : []).map((r) => {
          return {
            id: r.id,
            name: r.name,
            description: r.description,
            type: r.type,
            framework: r.framework,
            version: r.version,
            tags: r.tags || [],
            githubUrl: r.githubUrl || r.GithubUrl || r.githuburl || null,
            websiteUrl: r.websiteUrl || r.websiteurl || null,
            downloads: Number(r.downloads || 0),
            rating: Number(r.rating || 0),
            ratingCount: Number(r.ratingCount || r.ratingcount || 0),
            favourites: Number(r.favourites || 0),
            views: Number(r.views || 0),
            changelog: r.changelog || null,
            rawData: r.rawData || r.rawdata || '{}',
            createdAt: r.createdAt || r.createdat,
            updatedAt: r.updatedAt || r.updatedat,
            author: { id: r.author_id, username: r.author_username, avatar: r.author_avatar },
            uploadCategory: r.uploadCategory || r.uploadcategory || 'Framework',
          };
        });
        return res.json(out);
      } catch (rawErr) {
        console.error(
          'raw SQL fallback failed for /api/commands',
          rawErr && rawErr.message ? rawErr.message : rawErr,
        );
        return res.status(500).json({ error: 'failed' });
      }
    }
  } catch (err) {
    console.error('list commands error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Toggle favourite for a command (requires auth)
app.post('/api/commands/:id/favourite', requireDbReady, requireAuth, async (req, res) => {
  const cmdId = req.params.id;
  const userId = req.session.user.id;
  try {
    const exists = await prisma.$queryRaw`
      SELECT 1 FROM "Favourite" WHERE "userId" = ${userId} AND "commandId" = ${cmdId} LIMIT 1
    `;
    const already = Array.isArray(exists) && exists.length > 0;
    if (already) {
      await prisma.$executeRaw`
        DELETE FROM "Favourite" WHERE "userId" = ${userId} AND "commandId" = ${cmdId}
      `;
      try {
        await prisma.command.update({
          where: { id: cmdId },
          data: { favourites: { decrement: 1 } },
        });
      } catch (e) {
        // ignore decrement errors
      }
      return res.json({ ok: true, favourited: false });
    } else {
      await prisma.$executeRaw`
        INSERT INTO "Favourite" ("userId","commandId") VALUES (${userId}, ${cmdId})
      `;
      try {
        await prisma.command.update({
          where: { id: cmdId },
          data: { favourites: { increment: 1 } },
        });
      } catch (e) {
        // ignore increment errors
      }
      return res.json({ ok: true, favourited: true });
    }
  } catch (err) {
    console.error('favourite toggle error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed_to_toggle_favourite' });
  }
});

// Check if current user has favourited a command
app.get('/api/commands/:id/is-favourited', requireDbReady, requireAuth, async (req, res) => {
  const cmdId = req.params.id;
  const userId = req.session.user.id;
  try {
    const exists = await prisma.$queryRaw`
      SELECT 1 FROM "Favourite" WHERE "userId" = ${userId} AND "commandId" = ${cmdId} LIMIT 1
    `;
    const already = Array.isArray(exists) && exists.length > 0;
    return res.json({ favourited: already });
  } catch (err) {
    console.error('is-favourited error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Get commands uploaded by a user
app.get('/api/users/:id/commands', requireDbReady, async (req, res) => {
  const { id } = req.params;
  try {
    try {
      const cmds = await prisma.command.findMany({
        where: { authorId: id },
        include: { author: true },
      });
      try {
        const ids = cmds.map((c) => c.id).filter(Boolean);
        if (ids.length === 0) return res.json(cmds);
        const urows = await prisma.$queryRaw`
          SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
        `;
        const map = {};
        if (Array.isArray(urows))
          urows.forEach((r) => (map[r.id] = r.uploadCategory || r.uploadcategory));
        const out = cmds.map((c) => ({ ...c, uploadCategory: map[c.id] || 'Framework' }));
        return res.json(out);
      } catch (e) {
        return res.json(cmds);
      }
    } catch (prismaErr) {
      console.warn(
        '[api] Prisma findMany failed for user commands, falling back to raw SQL:',
        prismaErr && prismaErr.message ? prismaErr.message : prismaErr,
      );
      try {
        const rows = await prisma.$queryRaw`
          SELECT c.*, u.id as author_id, u.username as author_username, u.avatar as author_avatar
          FROM "Command" c LEFT JOIN "User" u ON c."authorId" = u.id
          WHERE c."authorId" = ${id}
          ORDER BY c."createdAt" DESC
        `;
        const out = (Array.isArray(rows) ? rows : []).map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          type: r.type,
          framework: r.framework,
          version: r.version,
          tags: r.tags || [],
          githubUrl: r.githubUrl || null,
          websiteUrl: r.websiteUrl || null,
          downloads: Number(r.downloads || 0),
          rating: Number(r.rating || 0),
          ratingCount: Number(r.ratingCount || 0),
          favourites: Number(r.favourites || 0),
          views: Number(r.views || 0),
          changelog: r.changelog || null,
          rawData: r.rawData || '{}',
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          author: { id: r.author_id, username: r.author_username, avatar: r.author_avatar },
          uploadCategory: r.uploadCategory || r.uploadcategory || 'Framework',
        }));
        return res.json(out);
      } catch (rawErr) {
        console.error(
          'raw SQL fallback failed for /api/users/:id/commands',
          rawErr && rawErr.message ? rawErr.message : rawErr,
        );
        return res.status(500).json({ error: 'failed' });
      }
    }
  } catch (err) {
    console.error('user commands error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// NOTE: Removed duplicate basic `/api/users/:id` handler so the
// more feature-complete profile handler defined later is used.

// Follow a user (requires auth)
app.post('/api/users/:id/follow', requireDbReady, requireAuth, async (req, res) => {
  try {
    const targetId = String(req.params.id);
    const me = req.session && req.session.user && String(req.session.user.id);
    if (!me) return res.status(401).json({ error: 'Not authenticated' });
    if (me === targetId) return res.status(400).json({ error: 'cannot_follow_self' });
    try {
      // best-effort insert if not exists
      await prisma.$executeRaw`
        INSERT INTO "Follower" ("followerId","followeeId")
        SELECT ${me}, ${targetId}
        WHERE NOT EXISTS (
          SELECT 1 FROM "Follower" WHERE "followerId" = ${me} AND "followeeId" = ${targetId}
        )
      `;
    } catch (e) {
      console.warn('follow insert raw SQL error', e && e.message ? e.message : e);
    }
    // return updated follower count
    try {
      const rows = await prisma.$queryRaw`
        SELECT COUNT(*) as cnt FROM "Follower" WHERE "followeeId" = ${targetId}
      `;
      const cnt = Array.isArray(rows) && rows.length ? Number(rows[0].cnt || 0) : 0;
      return res.json({ ok: true, following: true, followers: cnt });
    } catch (e) {
      return res.json({ ok: true, following: true });
    }
  } catch (err) {
    console.error('follow error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Unfollow a user (requires auth)
app.post('/api/users/:id/unfollow', requireDbReady, requireAuth, async (req, res) => {
  try {
    const targetId = String(req.params.id);
    const me = req.session && req.session.user && String(req.session.user.id);
    if (!me) return res.status(401).json({ error: 'Not authenticated' });
    if (me === targetId) return res.status(400).json({ error: 'cannot_unfollow_self' });
    try {
      await prisma.$executeRaw`
        DELETE FROM "Follower" WHERE "followerId" = ${me} AND "followeeId" = ${targetId}
      `;
    } catch (e) {
      console.warn('unfollow raw SQL error', e && e.message ? e.message : e);
    }
    try {
      const rows = await prisma.$queryRaw`
        SELECT COUNT(*) as cnt FROM "Follower" WHERE "followeeId" = ${targetId}
      `;
      const cnt = Array.isArray(rows) && rows.length ? Number(rows[0].cnt || 0) : 0;
      return res.json({ ok: true, following: false, followers: cnt });
    } catch (e) {
      return res.json({ ok: true, following: false });
    }
  } catch (err) {
    console.error('unfollow error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Check if current authenticated user is following given user
app.get('/api/users/:id/is-following', requireDbReady, requireAuth, async (req, res) => {
  try {
    const targetId = String(req.params.id);
    const me = req.session && req.session.user && String(req.session.user.id);
    if (!me) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const rows = await prisma.$queryRaw`
        SELECT 1 FROM "Follower" WHERE "followerId" = ${me} AND "followeeId" = ${targetId} LIMIT 1
      `;
      const following = Array.isArray(rows) && rows.length > 0;
      return res.json({ following });
    } catch (e) {
      console.warn('is-following check failed', e && e.message ? e.message : e);
      return res.json({ following: false });
    }
  } catch (err) {
    console.error('is-following error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Get favourited commands for a user (public)
app.get('/api/users/:id/favourites', requireDbReady, async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await prisma.$queryRaw`
      SELECT "commandId" FROM "Favourite" WHERE "userId" = ${id}
    `;
    const ids = (
      Array.isArray(rows) ? rows.map((r) => r.commandId || r.commandid || Object.values(r)[0]) : []
    ).filter(Boolean);
    if (ids.length === 0) return res.json([]);
    const cmds = await prisma.command.findMany({
      where: { id: { in: ids } },
      include: { author: true },
    });
    // attach uploadCategory
    try {
      const urows = await prisma.$queryRaw`
        SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
      `;
      const map = {};
      if (Array.isArray(urows))
        urows.forEach((r) => (map[r.id] = r.uploadCategory || r.uploadcategory));
      const out = cmds.map((c) => ({ ...c, uploadCategory: map[c.id] || 'Framework' }));
      return res.json(out);
    } catch (e) {
      return res.json(cmds);
    }
  } catch (err) {
    console.error('user favourites error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// List users with pagination and optional filters (tag, framework, q)
app.get('/api/users', requireDbReady, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    // Simple, safe aggregation per user (no complex filters yet)
    const sql = `
      SELECT u.id, u.username, u.avatar,
        (SELECT COUNT(*) FROM "Command" c WHERE c."authorId" = u.id) AS commands,
        (SELECT COALESCE(SUM(downloads),0) FROM "Command" c WHERE c."authorId" = u.id) AS downloads,
        (SELECT COALESCE(ROUND(AVG(NULLIF(rating,0))::numeric,2),0) FROM "Command" c WHERE c."authorId" = u.id) AS avg_rating
      FROM "User" u
      ORDER BY commands DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;
    // Log SQL for debugging when this endpoint errors in dev (opt-in via DEBUG_SQL=true)
    if (String(process.env.DEBUG_SQL).toLowerCase() === 'true') {
      console.log('[api] users list SQL:', sql.replace(/\s+/g, ' ').trim());
    }
    let rows = [];
    try {
      rows = await prisma.$queryRawUnsafe(sql);
    } catch (queryErr) {
      console.warn(
        '[api] prisma.$queryRawUnsafe failed for /api/users, falling back to Prisma client findMany',
        queryErr && queryErr.message ? queryErr.message : queryErr,
      );
      // fallback: simpler query via Prisma client (may be less performant)
      try {
        rows = await prisma.user.findMany({
          select: { id: true, username: true, avatar: true },
          skip: offset,
          take: limit,
        });
        // map to expected shape
        rows = (rows || []).map((r) => ({
          id: r.id,
          username: r.username,
          avatar: r.avatar,
          commands: 0,
          downloads: 0,
          avg_rating: 0,
        }));
      } catch (clientErr) {
        console.error(
          '[api] fallback findMany also failed for /api/users',
          clientErr && clientErr.stack ? clientErr.stack : clientErr,
        );
        throw clientErr;
      }
    }

    const countRes = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS cnt FROM "User"');
    const total = Array.isArray(countRes) && countRes.length ? Number(countRes[0].cnt || 0) : 0;

    // Normalize DB driver types (e.g., BigInt) to JSON-serializable values
    const normalized = (Array.isArray(rows) ? rows : []).map((r) => {
      const obj = {};
      for (const [k, v] of Object.entries(r || {})) {
        if (typeof v === 'bigint') obj[k] = Number(v);
        else obj[k] = v;
      }
      return obj;
    });

    return res.json({ users: normalized, page, limit, total });
  } catch (err) {
    console.error(
      'users list error',
      err && err.stack ? err.stack : err && err.message ? err.message : err,
    );
    return res.status(500).json({ error: 'failed' });
  }
});

// GET user profile with stats and top uploads
app.get('/api/users/:id', requireDbReady, async (req, res) => {
  try {
    const { id } = req.params;
    const userRows = await prisma.$queryRaw`
      SELECT id, username, avatar FROM "User" WHERE id = ${id} LIMIT 1
    `;
    const user = Array.isArray(userRows) && userRows.length ? userRows[0] : null;
    if (!user) return res.status(404).json({ error: 'not_found' });

    // follower/following counts
    let followers = 0;
    let following = 0;
    try {
      const f1 = await prisma.$queryRaw`
        SELECT COUNT(*) AS cnt FROM "Follower" WHERE "followeeId" = ${id}
      `;
      const f2 = await prisma.$queryRaw`
        SELECT COUNT(*) AS cnt FROM "Follower" WHERE "followerId" = ${id}
      `;
      followers = Array.isArray(f1) && f1.length ? Number(f1[0].cnt || 0) : 0;
      following = Array.isArray(f2) && f2.length ? Number(f2[0].cnt || 0) : 0;
    } catch (e) {
      // ignore
    }

    // top uploads (by downloads)
    const top = await prisma.$queryRaw`
      SELECT c.* FROM "Command" c WHERE c."authorId" = ${id} ORDER BY c.downloads DESC NULLS LAST LIMIT 8
    `;

    return res.json({
      user: { id: user.id, username: user.username, avatar: user.avatar, followers, following },
      top: Array.isArray(top) ? top : [],
    });
  } catch (err) {
    console.error('user profile error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Get favourited commands for current user (requires auth)
app.get('/api/users/me/favourites', requireDbReady, requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const rows = await prisma.$queryRaw`
      SELECT "commandId" FROM "Favourite" WHERE "userId" = ${userId}
    `;
    const ids = (
      Array.isArray(rows) ? rows.map((r) => r.commandId || r.commandid || Object.values(r)[0]) : []
    ).filter(Boolean);
    if (ids.length === 0) return res.json([]);
    const cmds = await prisma.command.findMany({
      where: { id: { in: ids } },
      include: { author: true },
    });
    try {
      const urows = await prisma.$queryRaw`
        SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
      `;
      const map = {};
      if (Array.isArray(urows))
        urows.forEach((r) => (map[r.id] = r.uploadCategory || r.uploadcategory));
      const out = cmds.map((c) => ({ ...c, uploadCategory: map[c.id] || 'Framework' }));
      return res.json(out);
    } catch (e) {
      return res.json(cmds);
    }
  } catch (err) {
    console.error('me favourites error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Aggregated stats for homepage
app.get('/api/stats', requireDbReady, async (req, res) => {
  try {
    const commandsCount = await prisma.command.count();
    const agg = await prisma.command.aggregate({ _sum: { downloads: true } });
    const totalDownloads = agg && agg._sum && agg._sum.downloads ? Number(agg._sum.downloads) : 0;
    const frameworksRes =
      await prisma.$queryRaw`SELECT COUNT(DISTINCT framework) as count FROM "Command"`;
    let frameworksCount = 0;
    try {
      if (Array.isArray(frameworksRes) && frameworksRes.length) {
        const v =
          frameworksRes[0].count || frameworksRes[0].COUNT || frameworksRes[0].count_distinct || 0;
        frameworksCount = Number(v);
      } else if (frameworksRes && typeof frameworksRes === 'object') {
        frameworksCount = Number(frameworksRes.count || 0);
      }
    } catch (e) {
      frameworksCount = 0;
    }

    res.json({ commands: commandsCount, downloads: totalDownloads, frameworks: frameworksCount });
  } catch (err) {
    console.error('stats error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'failed_to_get_stats' });
  }
});

app.get('/api/commands/:id', requireDbReady, async (req, res) => {
  const { id } = req.params;
  try {
    let updated;
    try {
      // Atomically increment the views counter and return the updated record
      updated = await prisma.command.update({
        where: { id },
        data: { views: { increment: 1 } },
        include: { author: true },
      });
    } catch (prismaErr) {
      console.warn(
        '[api] Prisma update failed for views, falling back to raw SQL:',
        prismaErr && prismaErr.message ? prismaErr.message : prismaErr,
      );
      try {
        const rows = await prisma.$queryRaw`
          UPDATE "Command" SET views = COALESCE(views,0) + 1 WHERE id = ${id} RETURNING *
        `;
        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        if (!row) return res.status(404).json({ error: 'Not found' });
        const auth = await prisma.$queryRaw`
          SELECT id, username, avatar FROM "User" WHERE id = ${row.authorId} LIMIT 1
        `;
        updated = {
          ...row,
          author:
            auth && auth[0]
              ? { id: auth[0].id, username: auth[0].username, avatar: auth[0].avatar }
              : null,
        };
      } catch (rawErr) {
        console.error(
          'raw SQL fallback failed for increment views',
          rawErr && rawErr.message ? rawErr.message : rawErr,
        );
        return res.status(500).json({ error: 'failed' });
      }
    }
    if (!updated) return res.status(404).json({ error: 'Not found' });
    // If user is authenticated include their personal rating for UI convenience
    const sessionUser = req.session && req.session.user;
    if (sessionUser && sessionUser.id) {
      try {
        const rows = await prisma.$queryRaw`
          SELECT value FROM "Rating" WHERE "userId" = ${sessionUser.id} AND "commandId" = ${id} LIMIT 1
        `;
        const myRating = Array.isArray(rows) && rows.length ? Number(rows[0].value) : null;
        // fetch uploadCategory
        try {
          const urows = await prisma.$queryRaw`
            SELECT "uploadCategory" FROM "Command" WHERE id = ${id} LIMIT 1
          `;
          const uploadCategory =
            Array.isArray(urows) && urows.length
              ? urows[0].uploadCategory || urows[0].uploadcategory
              : 'Framework';
          return res.json({ ...updated, myRating, uploadCategory });
        } catch (e) {
          return res.json({ ...updated, myRating, uploadCategory: 'Framework' });
        }
      } catch (e) {
        // ignore rating lookup errors
        return res.json({ ...updated, myRating: null, uploadCategory: 'Framework' });
      }
    }
    // fetch uploadCategory for unauthenticated requests
    try {
      const urows = await prisma.$queryRaw`
        SELECT "uploadCategory" FROM "Command" WHERE id = ${id} LIMIT 1
      `;
      const uploadCategory =
        Array.isArray(urows) && urows.length
          ? urows[0].uploadCategory || urows[0].uploadcategory
          : 'Framework';
      return res.json({ ...updated, uploadCategory });
    } catch (e) {
      return res.json({ ...updated, uploadCategory: 'Framework' });
    }
  } catch (err) {
    if (String(err.message || '').includes('No such'))
      return res.status(404).json({ error: 'Not found' });
    console.error('get command error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Get current authenticated user's rating for a command
app.get('/api/commands/:id/my-rating', requireDbReady, requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  try {
    const rows = await prisma.$queryRaw`
        SELECT value FROM "Rating" WHERE "userId" = ${userId} AND "commandId" = ${id} LIMIT 1
      `;
    const myRating = Array.isArray(rows) && rows.length ? Number(rows[0].value) : null;
    return res.json({ rating: myRating });
  } catch (err) {
    console.error('my-rating error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Upsert a user's rating for a command and update aggregate on Command
app.post('/api/commands/:id/rate', requireDbReady, requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  const { rating } = req.body;
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5)
    return res.status(400).json({ error: 'invalid_rating' });
  try {
    await prisma.$transaction(async (tx) => {
      // Lock existing rating if present
      const prevRows = await tx.$queryRaw`
        SELECT value FROM "Rating" WHERE "userId" = ${userId} AND "commandId" = ${id} LIMIT 1 FOR UPDATE
      `;
      if (Array.isArray(prevRows) && prevRows.length) {
        const prev = Number(prevRows[0].value);
        // update rating row
        await tx.$executeRaw`
          UPDATE "Rating" SET value = ${r}, "createdAt" = now() WHERE "userId" = ${userId} AND "commandId" = ${id}
        `;
        // adjust Command aggregate (keep same ratingCount)
        await tx.$executeRaw`
          UPDATE "Command" SET rating = CASE WHEN "ratingCount" > 0 THEN ((rating * "ratingCount") - ${prev} + ${r})::double precision / "ratingCount" ELSE ${r} END WHERE id = ${id}
        `;
      } else {
        // insert new rating
        await tx.$executeRaw`
          INSERT INTO "Rating" ("userId","commandId",value) VALUES (${userId}, ${id}, ${r})
        `;
        // update Command aggregate and increment count
        await tx.$executeRaw`
          UPDATE "Command" SET rating = ((rating * "ratingCount") + ${r})::double precision / ("ratingCount" + 1), "ratingCount" = "ratingCount" + 1 WHERE id = ${id}
        `;
      }
    });

    // return updated aggregate
    const cmd = await prisma.command.findUnique({ where: { id } });
    if (!cmd) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true, rating: cmd.rating, ratingCount: cmd.ratingCount, myRating: r });
  } catch (err) {
    console.error('rate error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Increment download counter for a command (fire on download)
app.post('/api/commands/:id/download', requireDbReady, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.command.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true, downloads: updated.downloads });
  } catch (err) {
    console.error('download increment error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

app.post('/api/commands', requireDbReady, requireAuth, async (req, res) => {
  try {
    const data = req.body;
    // Use session user as authorId and ignore any client-supplied authorId
    const authorId = req.session.user.id;
    // Create command via Prisma but avoid passing unknown DB columns (uploadCategory)
    const createData = { ...data };
    delete createData.uploadCategory;
    let cmd = null;
    try {
      cmd = await prisma.command.create({ data: { ...createData, authorId } });
    } catch (e) {
      const msg = (e && e.message) || String(e);
      // If Prisma complains that `uploadCategory` column doesn't exist, fall back to raw INSERT
      if (msg.includes('uploadCategory') || msg.includes('does not exist')) {
        try {
          // Build safe SQL-literal helpers
          const esc = (v) =>
            v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
          const tags = Array.isArray(data.tags) ? data.tags : [];
          const tagsSql =
            tags.length > 0
              ? `ARRAY[${tags.map((t) => `'${String(t).replace(/'/g, "''")}'`).join(',')}]::text[]`
              : `ARRAY[]::text[]`;
          const id = data.id || randomUUID();
          const name = esc(data.name || id);
          const description = esc(data.description || '');
          const type = esc(data.type || '');
          const framework = esc(data.framework || '');
          const version = esc(data.version || '');
          const githubUrl = esc(data.githubUrl || null);
          const websiteUrl = esc(data.websiteUrl || null);
          const changelog = esc(data.changelog || null);
          const rawData = esc(data.rawData || '{}');

          const insertSQL = `INSERT INTO "Command" (id, name, description, type, framework, version, tags, "githubUrl", "websiteUrl", downloads, rating, "ratingCount", favourites, views, changelog, "rawData", "createdAt", "updatedAt", "authorId") VALUES (${esc(id)}, ${name}, ${description}, ${type}, ${framework}, ${version}, ${tagsSql}, ${githubUrl}, ${websiteUrl}, 0, 0, 0, 0, 0, ${changelog}, ${rawData}, now(), now(), ${esc(authorId)}) RETURNING id`;
          const inserted = await prisma.$queryRawUnsafe(insertSQL);
          // inserted may be an array of rows or a single row depending on adapter
          const insertedId =
            Array.isArray(inserted) && inserted.length
              ? inserted[0].id || Object.values(inserted[0])[0]
              : id;
          // Try to fetch via Prisma; if that fails, return minimal object
          try {
            const withAuthor = await prisma.command.findUnique({
              where: { id: insertedId },
              include: { author: true },
            });
            cmd = withAuthor || { id: insertedId, name: data.name, authorId };
          } catch (fetchErr) {
            cmd = { id: insertedId, name: data.name, authorId };
          }
        } catch (rawErr) {
          console.error(
            'raw insert fallback failed',
            rawErr && rawErr.message ? rawErr.message : rawErr,
          );
          return res.status(500).json({ error: 'failed_to_create_command' });
        }
      } else {
        throw e;
      }
    }

    // If client provided uploadCategory, persist it via raw SQL (best-effort)
    if (data.uploadCategory) {
      try {
        await prisma.$executeRaw`
          UPDATE "Command" SET "uploadCategory" = ${data.uploadCategory} WHERE id = ${cmd.id}
        `;
      } catch (ue) {
        // ignore if DB doesn't have column
      }
    }

    // fetch uploadCategory and attach to response if possible
    try {
      const urows = await prisma.$queryRaw`
        SELECT "uploadCategory" FROM "Command" WHERE id = ${cmd.id} LIMIT 1
      `;
      const uploadCategory =
        Array.isArray(urows) && urows.length
          ? urows[0].uploadCategory || urows[0].uploadcategory
          : 'Framework';
      const withAuthor = await prisma.command.findUnique({
        where: { id: cmd.id },
        include: { author: true },
      });
      return res.status(201).json({ ...withAuthor, uploadCategory });
    } catch (e) {
      return res.status(201).json(cmd);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update an existing command (only creator or admins)
app.put('/api/commands/:id', requireDbReady, requireAuth, async (req, res) => {
  const { id } = req.params;
  const sessionUser = req.session && req.session.user;
  const adminList = process.env.ADMIN_IDS
    ? String(process.env.ADMIN_IDS)
        .split(',')
        .map((s) => s.trim())
    : [];
  const isAdmin = sessionUser && adminList.includes(sessionUser.id);
  try {
    const existing = await prisma.command.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!(sessionUser && (sessionUser.id === existing.authorId || isAdmin))) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const body = req.body || {};
    // Only allow updating a safe subset of fields
    const updatable = {};
    const fields = [
      'name',
      'description',
      'type',
      'framework',
      'version',
      'tags',
      'githubUrl',
      'websiteUrl',
      'changelog',
      'rawData',
      'uploadCategory',
    ];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(body, f)) updatable[f] = body[f];
    }

    // normalize tags if string
    if (updatable.tags && typeof updatable.tags === 'string') {
      try {
        updatable.tags = updatable.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      } catch (e) {
        updatable.tags = [];
      }
    }

    const updated = await prisma.command.update({ where: { id }, data: { ...updatable } });
    const withAuthor = await prisma.command.findUnique({
      where: { id },
      include: { author: true },
    });
    return res.json(withAuthor);
  } catch (err) {
    console.error('update command error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Get creator analytics
app.get('/api/analytics/creator', requireDbReady, requireAuth, async (req, res) => {
  const { period = '30days' } = req.query;
  const sessionUser = req.session && req.session.user;
  
  if (!sessionUser || !sessionUser.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Determine date range
    let daysBack = 30;
    if (period === '7days') daysBack = 7;
    else if (period === 'alltime') daysBack = 36500; // ~100 years
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get all commands for this creator
    const commands = await prisma.command.findMany({
      where: { authorId: sessionUser.id },
      include: { 
        ratings: { where: { createdAt: { gte: cutoffDate } } },
        favorites: { where: { createdAt: { gte: cutoffDate } } },
      }
    });

    if (!commands.length) {
      return res.json({
        stats: {
          totalViews: 0,
          totalDownloads: 0,
          totalFavorites: 0,
          totalShares: 0,
          totalRatings: 0,
          uniqueUsers: 0,
          averageRating: 0,
          peakHour: null,
          peakDayOfWeek: null,
        },
        commands: [],
        topPerformers: [],
      });
    }

    const commandIds = commands.map(c => c.id);

    // Get shares for this period (may not exist if migration hasn't run)
    let shares = [];
    try {
      shares = await prisma.share.findMany({
        where: {
          commandId: { in: commandIds },
          createdAt: { gte: cutoffDate }
        }
      });
    } catch (e) {
      console.log('Share table not available, skipping share analytics');
      shares = [];
    }

    // Calculate aggregate stats
    const totalFavorites = commands.reduce((sum, cmd) => sum + cmd.favorites.length, 0);
    const totalShares = shares.length;
    const totalRatings = commands.reduce((sum, cmd) => sum + cmd.ratings.length, 0);

    // Calculate unique users
    const uniqueUserIds = new Set();
    commands.forEach(cmd => {
      cmd.favorites.forEach(fav => uniqueUserIds.add(fav.userId));
      cmd.ratings.forEach(rating => uniqueUserIds.add(rating.userId));
    });
    shares.forEach(share => {
      if (share.userId) uniqueUserIds.add(share.userId);
    });

    // Calculate average rating
    const allRatings = commands.flatMap(cmd => cmd.ratings);
    const averageRating = allRatings.length > 0
      ? (allRatings.reduce((sum, r) => sum + r.value, 0) / allRatings.length)
      : 0;

    // Calculate peak hour and peak day of week
    const peakHour = calculatePeakHour(commands, shares);
    const peakDayOfWeek = calculatePeakDayOfWeek(commands, shares);

    // Build per-command analytics
    const commandAnalytics = commands.map(cmd => {
      const cmdShares = shares.filter(s => s.commandId === cmd.id);
      const cmdFavs = cmd.favorites;
      const cmdRatings = cmd.ratings;

      const cmdAvgRating = cmdRatings.length > 0
        ? cmdRatings.reduce((sum, r) => sum + r.value, 0) / cmdRatings.length
        : 0;

      return {
        id: cmd.id,
        name: cmd.name,
        description: cmd.description,
        views: cmd.views || 0,
        downloads: cmd.downloads || 0,
        favorites: cmdFavs.length,
        shares: cmdShares.length,
        ratings: cmdRatings.length,
        averageRating: Math.round(cmdAvgRating * 100) / 100,
        engagement: (cmd.views || 0) + (cmd.downloads || 0) + cmdFavs.length + cmdShares.length + cmdRatings.length,
      };
    });

    // Sort for top performers
    const topPerformers = [...commandAnalytics]
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);

    return res.json({
      stats: {
        totalViews: commands.reduce((sum, cmd) => sum + (cmd.views || 0), 0),
        totalDownloads: commands.reduce((sum, cmd) => sum + (cmd.downloads || 0), 0),
        totalFavorites,
        totalShares,
        totalRatings,
        uniqueUsers: uniqueUserIds.size,
        averageRating: Math.round(averageRating * 100) / 100,
        peakHour,
        peakDayOfWeek,
      },
      commands: commandAnalytics,
      topPerformers,
    });
  } catch (error) {
    console.error('Analytics error:', error && error.message ? error.message : error);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error && error.message ? error.message : String(error) });
  }
});

// Helper: Calculate peak hour
function calculatePeakHour(commands, shares) {
  const hours = {};
  
  // Count shares by hour
  shares.forEach(share => {
    const hour = new Date(share.createdAt).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
  });

  // Count favorites by hour
  commands.forEach(cmd => {
    cmd.favorites.forEach(fav => {
      const hour = new Date(fav.createdAt).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });
    cmd.ratings.forEach(rating => {
      const hour = new Date(rating.createdAt).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });
  });

  if (Object.keys(hours).length === 0) return null;

  const peakHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0][0];
  return `${peakHour}:00 - ${(Number(peakHour) + 1) % 24}:00`;
}

// Helper: Calculate peak day of week
function calculatePeakDayOfWeek(commands, shares) {
  const days = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  shares.forEach(share => {
    const dayOfWeek = new Date(share.createdAt).getDay();
    const dayName = dayNames[dayOfWeek];
    days[dayName]++;
  });

  commands.forEach(cmd => {
    cmd.favorites.forEach(fav => {
      const dayOfWeek = new Date(fav.createdAt).getDay();
      const dayName = dayNames[dayOfWeek];
      days[dayName]++;
    });
    cmd.ratings.forEach(rating => {
      const dayOfWeek = new Date(rating.createdAt).getDay();
      const dayName = dayNames[dayOfWeek];
      days[dayName]++;
    });
  });

  const peakDay = Object.entries(days).sort((a, b) => b[1] - a[1])[0][0];
  return peakDay;
}

// Admin middleware: check if user is admin
async function requireAdmin(req, res, next) {
  // Check if DB is ready
  if (!dbReady) {
    return res.status(503).json({ error: 'Service not ready' });
  }

  const sessionUser = req.session && req.session.user;
  if (!sessionUser || !sessionUser.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id }
    });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden - not an admin' });
    }
    req.userRole = user.adminRole || 'SUPER_ADMIN';
    next();
  } catch (err) {
    console.error('[admin] Error checking admin status:', err);
    return res.status(500).json({ error: 'Error checking admin status' });
  }
}

// Admin: Get admin info
app.get('/api/admin/info', requireDbReady, requireAuth, async (req, res) => {
  const sessionUser = req.session && req.session.user;
  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id }
    });
    res.json({
      isAdmin: user?.isAdmin || false,
      role: user?.adminRole || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// Admin: Get dashboard data
app.get('/api/admin/data', requireAdmin, async (req, res) => {
  const { section = 'overview', filter = 'all' } = req.query;

  try {
    if (section === 'overview') {
      const totalUsers = await prisma.user.count();
      const totalCommands = await prisma.command.count();
      const pendingCommands = await prisma.command.count({ where: { approved: false } });
      const pendingReports = await prisma.report.count({ where: { resolved: false } });

      const recentActivity = await prisma.command.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { author: true }
      });

      return res.json({
        totalUsers,
        totalCommands,
        pendingCommands,
        pendingReports,
        recentActivity: recentActivity.map(cmd => ({
          action: cmd.approved ? 'Approved command' : 'New command uploaded',
          target: `"${cmd.name}" by ${cmd.author?.username}`,
          timestamp: cmd.createdAt
        }))
      });
    }

    if (section === 'commands') {
      let where = {};
      if (filter === 'pending') where = { approved: false };
      if (filter === 'approved') where = { approved: true };

      const commands = await prisma.command.findMany({
        where,
        include: { author: true },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ commands });
    }

    if (section === 'users') {
      const users = await prisma.user.findMany({
        include: { _count: { select: { commands: true } } },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ users });
    }

    if (section === 'reports') {
      const reports = await prisma.report.findMany({
        include: { reporter: true },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ reports });
    }

    res.status(400).json({ error: 'Invalid section' });
  } catch (error) {
    console.error('Admin data error:', error);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
});

// Admin: Approve command
app.post('/api/admin/commands/:id/approve', requireAdmin, async (req, res) => {
  if (req.userRole === 'VIEWER') {
    return res.status(403).json({ error: 'Viewers cannot approve commands' });
  }

  const { id } = req.params;
  const sessionUser = req.session && req.session.user;

  try {
    await prisma.command.update({
      where: { id },
      data: {
        approved: true,
        approvedBy: sessionUser.id
      }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve command' });
  }
});

// Admin: Reject command
app.post('/api/admin/commands/:id/reject', requireAdmin, async (req, res) => {
  if (req.userRole === 'VIEWER') {
    return res.status(403).json({ error: 'Viewers cannot reject commands' });
  }

  const { id } = req.params;
  const { reason } = req.body || {};
  const sessionUser = req.session && req.session.user;

  try {
    await prisma.command.update({
      where: { id },
      data: {
        approved: false,
        approvedBy: sessionUser.id,
        approvalReason: reason
      }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject command' });
  }
});

// Admin: Suspend user
app.post('/api/admin/users/:id/suspend', requireAdmin, async (req, res) => {
  if (req.userRole === 'VIEWER') {
    return res.status(403).json({ error: 'Viewers cannot suspend users' });
  }

  const { id } = req.params;

  try {
    await prisma.user.update({
      where: { id },
      data: { suspended: true }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Admin: Resolve report
app.post('/api/admin/reports/:id/resolve', requireAdmin, async (req, res) => {
  if (req.userRole === 'VIEWER') {
    return res.status(403).json({ error: 'Viewers cannot resolve reports' });
  }

  const { id } = req.params;
  const { resolutionNote } = req.body || {};
  const sessionUser = req.session && req.session.user;

  try {
    await prisma.report.update({
      where: { id },
      data: {
        resolved: true,
        resolvedBy: sessionUser.id,
        resolutionNote,
        resolvedAt: new Date()
      }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

// Start server immediately; dbEnsure runs in background (db-dependent routes will return 503 until ready)

// Schedule periodic tasks
try {
  // Flush buffered analytics to DB every 5 minutes
  scheduleAnalyticsFlush(5 * 60 * 1000);
  console.log('[start] Analytics flush scheduled (every 5 minutes)');

  // Compute trending commands every 6 hours
  scheduleTrendingComputation(6 * 60 * 60 * 1000);
  console.log('[start] Trending computation scheduled (every 6 hours)');
} catch (error) {
  logError('Failed to schedule background tasks', error);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
