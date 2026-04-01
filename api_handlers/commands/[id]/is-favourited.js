import prisma from '../../_lib/prisma.js';
import { getSessionFromReq } from '../../_lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.setHeader('Allow', 'GET') && res.status(405).end('Method Not Allowed');
  const { id } = req.query;
  const session = getSessionFromReq(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const userId = session.id;
  try {
    const exists = await prisma.$queryRaw`
      SELECT 1 FROM "Favourite" WHERE "userId" = ${userId} AND "commandId" = ${id} LIMIT 1
    `;
    const already = Array.isArray(exists) && exists.length > 0;
    return res.json({ favourited: already });
  } catch (err) {
    console.error('is-favourited error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
}
