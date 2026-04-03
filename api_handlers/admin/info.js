import prisma from '../_lib/prisma.js';
import { verifyToken } from '../_lib/jwt.js';

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
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = verifyToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user from database to check admin status
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, isAdmin: true, adminRole: true, suspended: true, sessionVersion: true },
    });

    if (!user || !user.isAdmin || user.suspended || (user.sessionVersion || 0) !== (session.sessionVersion || 0)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return admin info
    return res.json({
      isAdmin: true,
      role: user.adminRole || 'SUPER_ADMIN',
      userId: user.id,
    });
  } catch (error) {
    console.error('[admin/info]', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
