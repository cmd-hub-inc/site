import prisma from '../_lib/prisma.js';
import { verifyToken, signSession } from '../_lib/jwt.js';

function cookieHeader(name, value, opts = {}) {
  const parts = [`${name}=${value}`];
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  parts.push('Path=/');
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  parts.push('SameSite=Lax');
  return parts.join('; ');
}

export default async function handler(req, res) {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    const pending = verifyToken(String(token));
    if (!pending) return res.status(404).json({ status: 'pending_not_found' });

    // Upsert user
    let user;
    try {
      user = await prisma.user.upsert({
        where: { id: pending.discordId },
        create: { id: pending.discordId, username: pending.username, avatar: pending.avatar },
        update: { username: pending.username, avatar: pending.avatar },
      });
    } catch (e) {
      const msg = e && e.message ? String(e.message) : '';
      if (msg.includes('Unknown argument `avatar`') || msg.includes('Unknown arg') || msg.includes('avatar')) {
        user = await prisma.user.upsert({
          where: { id: pending.discordId },
          create: { id: pending.discordId, username: pending.username },
          update: { username: pending.username },
        });
      } else {
        throw e;
      }
    }

    // create session JWT
    const sessionToken = signSession({ id: user.id, username: user.username, avatar: user.avatar });
    const isProd = process.env.NODE_ENV === 'production';
    const cookie = cookieHeader('session', sessionToken, { maxAge: 7 * 24 * 60 * 60, httpOnly: true, secure: isProd });
    res.setHeader('Set-Cookie', cookie);
    return res.json({ ok: true, user: { id: user.id, username: user.username, avatar: user.avatar } });
  } catch (err) {
    console.error('auth complete error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'server_error' });
  }
}
