import prisma from './prisma.js';
import { getSessionFromReq } from './utils.js';

export async function requireAdminOrFail(req, res) {
  const session = getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      isAdmin: true,
      adminRole: true,
      suspended: true,
      sessionVersion: true,
    },
  });

  if (!user || !user.isAdmin) {
    res.status(403).json({ error: 'Access denied' });
    return null;
  }

  if (user.suspended || (user.sessionVersion || 0) !== (session.sessionVersion || 0)) {
    res.status(403).json({ error: 'Access denied' });
    return null;
  }

  return { session, user };
}