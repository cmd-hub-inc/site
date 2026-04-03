import prisma from '../../_lib/prisma.js';
import { verifyToken } from '../../_lib/jwt.js';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      select: { id: true, isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const commandId = req.query?.id;
    if (!commandId) {
      return res.status(400).json({ error: 'Command ID required' });
    }

    // Update command approval status
    const updated = await prisma.command.update({
      where: { id: commandId },
      data: {
        approved: true,
        approvedBy: user.id,
      },
    });

    return res.json({
      success: true,
      command: {
        id: updated.id,
        name: updated.name,
        approved: updated.approved,
      },
    });
  } catch (error) {
    console.error('[admin/commands/approve]', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Command not found' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}
