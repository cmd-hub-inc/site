import { verifyToken } from './jwt.js';

export function parseCookies(cookieHeader) {
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

export function getSessionFromReq(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies.session;
  if (!token) return null;
  const s = verifyToken(token);
  return s || null;
}

export function requireAuthOrFail(req, res) {
  const s = getSessionFromReq(req);
  if (!s) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return s;
}

export function clearSessionCookie(res) {
  const cookie = `session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
  res.setHeader('Set-Cookie', cookie);
}
