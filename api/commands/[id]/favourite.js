import prisma from '../../../_lib/prisma.js';
import { getSessionFromReq } from '../../../_lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.setHeader('Allow', 'POST') && res.status(405).end('Method Not Allowed');
  const { id } = req.query;
  const session = getSessionFromReq(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const userId = session.id;
  try {
    const exists = await prisma.$queryRaw`
      SELECT 1 FROM "Favourite" WHERE "userId" = ${userId} AND "commandId" = ${id} LIMIT 1
    `;
    const already = Array.isArray(exists) && exists.length > 0;
    if (already) {
      await prisma.$executeRaw`
        DELETE FROM "Favourite" WHERE "userId" = ${userId} AND "commandId" = ${id}
      `;
      try { await prisma.command.update({ where: { id }, data: { favourites: { decrement: 1 } } }); } catch (e) {}
      return res.json({ ok: true, favourited: false });
    } else {
      await prisma.$executeRaw`
        INSERT INTO "Favourite" ("userId","commandId") VALUES (${userId}, ${id})
      `;
      try { await prisma.command.update({ where: { id }, data: { favourites: { increment: 1 } } }); } catch (e) {}
      return res.json({ ok: true, favourited: true });
    }
  } catch (err) {
    console.error('favourite toggle error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed_to_toggle_favourite' });
  }
}
