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

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

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
  if (redisClient) {
    await redisClient.set(PENDING_PREFIX + token, JSON.stringify(data), 'EX', ttl);
  } else {
    pendingAuthMap.set(token, data);
  }
}
async function getPending(token) {
  if (redisClient) {
    const v = await redisClient.get(PENDING_PREFIX + token);
    return v ? JSON.parse(v) : null;
  } else {
    return pendingAuthMap.get(token) || null;
  }
}
async function deletePending(token) {
  if (redisClient) {
    await redisClient.del(PENDING_PREFIX + token);
  } else {
    pendingAuthMap.delete(token);
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
    const pending = await getPending(String(token));
    if (!pending) return res.status(404).json({ status: 'pending_not_found' });

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

      // create session for this request
      req.session.user = { id: user.id, username: user.username, avatar: user.avatar };
      req.session.save(async (err) => {
        if (err) {
          console.error('session save error', err);
          return res.status(500).json({ error: 'failed_to_save_session' });
        }
        await deletePending(String(token));
        return res.json({
          ok: true,
          user: { id: user.id, username: user.username, avatar: user.avatar },
        });
      });
    } catch (e) {
      // If DB not ready, return 202 to indicate pending
      console.warn('auth complete error (likely DB not ready):', e && e.message ? e.message : e);
      return res.status(202).json({ status: 'pending' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Return current authenticated user based on JWT cookie
app.get('/api/me', requireDbReady, async (req, res) => {
  try {
    const s = req.session && req.session.user;
    if (!s) return res.json({ user: null });
    const adminList = (process.env.ADMIN_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
    const isAdmin = adminList.includes(String(s.id));
    try {
      const user = await prisma.user.findUnique({ where: { id: s.id } });
      return res.json({ user: user ? { id: user.id, username: user.username, avatar: user.avatar } : s, isAdmin });
    } catch (e) {
      return res.json({ user: s, isAdmin });
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
        if (Array.isArray(rows)) rows.forEach((r) => (map[r.id || r.ID || Object.values(r)[0]] = r.uploadCategory || r.uploadcategory || r.UploadCategory));
        const out = cmds.map((c) => ({ ...c, uploadCategory: map[c.id] || 'Framework' }));
        return res.json(out);
      }
      return res.json(cmds);
    } catch (prismaErr) {
      console.warn('[api] Prisma findMany failed, falling back to raw SQL:', prismaErr && prismaErr.message ? prismaErr.message : prismaErr);
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
        console.error('raw SQL fallback failed for /api/commands', rawErr && rawErr.message ? rawErr.message : rawErr);
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
      const cmds = await prisma.command.findMany({ where: { authorId: id }, include: { author: true } });
      try {
        const ids = cmds.map((c) => c.id).filter(Boolean);
        if (ids.length === 0) return res.json(cmds);
        const urows = await prisma.$queryRaw`
          SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
        `;
        const map = {};
        if (Array.isArray(urows)) urows.forEach((r) => (map[r.id] = r.uploadCategory || r.uploadcategory));
        const out = cmds.map((c) => ({ ...c, uploadCategory: map[c.id] || 'Framework' }));
        return res.json(out);
      } catch (e) {
        return res.json(cmds);
      }
    } catch (prismaErr) {
      console.warn('[api] Prisma findMany failed for user commands, falling back to raw SQL:', prismaErr && prismaErr.message ? prismaErr.message : prismaErr);
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
        console.error('raw SQL fallback failed for /api/users/:id/commands', rawErr && rawErr.message ? rawErr.message : rawErr);
        return res.status(500).json({ error: 'failed' });
      }
    }
  } catch (err) {
    console.error('user commands error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Public: get basic user profile by id
app.get('/api/users/:id', requireDbReady, async (req, res) => {
  const { id } = req.params;
  try {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return res.status(404).json({ error: 'Not found' });
    const username = u.username && u.username.endsWith('#0') ? u.username.replace(/#0$/, '') : u.username;
    return res.json({ id: u.id, username, avatar: u.avatar });
  } catch (err) {
    console.error('get user profile error', err && err.message ? err.message : err);
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
    const cmds = await prisma.command.findMany({ where: { id: { in: ids } }, include: { author: true } });
    // attach uploadCategory
    try {
      const urows = await prisma.$queryRaw`
        SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
      `;
      const map = {};
      if (Array.isArray(urows)) urows.forEach((r) => (map[r.id] = r.uploadCategory || r.uploadcategory));
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
      console.warn('[api] prisma.$queryRawUnsafe failed for /api/users, falling back to Prisma client findMany', queryErr && queryErr.message ? queryErr.message : queryErr);
      // fallback: simpler query via Prisma client (may be less performant)
      try {
        rows = await prisma.user.findMany({
          select: { id: true, username: true, avatar: true },
          skip: offset,
          take: limit,
        });
        // map to expected shape
        rows = (rows || []).map((r) => ({ id: r.id, username: r.username, avatar: r.avatar, commands: 0, downloads: 0, avg_rating: 0 }));
      } catch (clientErr) {
        console.error('[api] fallback findMany also failed for /api/users', clientErr && clientErr.stack ? clientErr.stack : clientErr);
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
    console.error('users list error', err && err.stack ? err.stack : err && err.message ? err.message : err);
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

    return res.json({ user: { id: user.id, username: user.username, avatar: user.avatar, followers, following }, top: Array.isArray(top) ? top : [] });
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
    const cmds = await prisma.command.findMany({ where: { id: { in: ids } }, include: { author: true } });
    try {
      const urows = await prisma.$queryRaw`
        SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
      `;
      const map = {};
      if (Array.isArray(urows)) urows.forEach((r) => (map[r.id] = r.uploadCategory || r.uploadcategory));
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
      console.warn('[api] Prisma update failed for views, falling back to raw SQL:', prismaErr && prismaErr.message ? prismaErr.message : prismaErr);
      try {
        const rows = await prisma.$queryRaw`
          UPDATE "Command" SET views = COALESCE(views,0) + 1 WHERE id = ${id} RETURNING *
        `;
        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        if (!row) return res.status(404).json({ error: 'Not found' });
        const auth = await prisma.$queryRaw`
          SELECT id, username, avatar FROM "User" WHERE id = ${row.authorId} LIMIT 1
        `;
        updated = { ...row, author: auth && auth[0] ? { id: auth[0].id, username: auth[0].username, avatar: auth[0].avatar } : null };
      } catch (rawErr) {
        console.error('raw SQL fallback failed for increment views', rawErr && rawErr.message ? rawErr.message : rawErr);
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
          const uploadCategory = Array.isArray(urows) && urows.length ? urows[0].uploadCategory || urows[0].uploadcategory : 'Framework';
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
      const uploadCategory = Array.isArray(urows) && urows.length ? urows[0].uploadCategory || urows[0].uploadcategory : 'Framework';
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
app.get(
  '/api/commands/:id/my-rating',
  requireDbReady,
  requireAuth,
  async (req, res) => {
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
  },
);

// Upsert a user's rating for a command and update aggregate on Command
app.post('/api/commands/:id/rate', requireDbReady, requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  const { rating } = req.body;
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ error: 'invalid_rating' });
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
          const esc = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
          const tags = Array.isArray(data.tags) ? data.tags : [];
          const tagsSql = tags.length > 0 ? `ARRAY[${tags.map((t) => `'${String(t).replace(/'/g, "''")}'`).join(',')}]::text[]` : `ARRAY[]::text[]`;
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
          const insertedId = Array.isArray(inserted) && inserted.length ? (inserted[0].id || Object.values(inserted[0])[0]) : id;
          // Try to fetch via Prisma; if that fails, return minimal object
          try {
            const withAuthor = await prisma.command.findUnique({ where: { id: insertedId }, include: { author: true } });
            cmd = withAuthor || { id: insertedId, name: data.name, authorId };
          } catch (fetchErr) {
            cmd = { id: insertedId, name: data.name, authorId };
          }
        } catch (rawErr) {
          console.error('raw insert fallback failed', rawErr && rawErr.message ? rawErr.message : rawErr);
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
      const uploadCategory = Array.isArray(urows) && urows.length ? urows[0].uploadCategory || urows[0].uploadcategory : 'Framework';
      const withAuthor = await prisma.command.findUnique({ where: { id: cmd.id }, include: { author: true } });
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
  const adminList = process.env.ADMIN_IDS ? String(process.env.ADMIN_IDS).split(',').map((s) => s.trim()) : [];
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
        updatable.tags = updatable.tags.split(',').map((t) => t.trim()).filter(Boolean);
      } catch (e) {
        updatable.tags = [];
      }
    }

    const updated = await prisma.command.update({ where: { id }, data: { ...updatable } });
    const withAuthor = await prisma.command.findUnique({ where: { id }, include: { author: true } });
    return res.json(withAuthor);
  } catch (err) {
    console.error('update command error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
});

// Start server immediately; dbEnsure runs in background (db-dependent routes will return 503 until ready)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
