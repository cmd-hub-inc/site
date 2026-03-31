import { verifyToken } from './_lib/jwt.js';
import prisma from './_lib/prisma.js';

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies.session;
    if (!token) return res.json({ user: null });
    const s = verifyToken(token);
    if (!s) return res.json({ user: null });
    try {
      const user = await prisma.user.findUnique({ where: { id: s.id } });
      return res.json({ user: user ? { id: user.id, username: user.username, avatar: user.avatar } : s });
    } catch (e) {
      return res.json({ user: s });
    }
  } catch (err) {
    console.error('me endpoint error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
}
