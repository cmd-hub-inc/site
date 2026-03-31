import prisma from '../../_lib/prisma.js';
import { getSessionFromReq } from '../../_lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.setHeader('Allow', 'POST') && res.status(405).end('Method Not Allowed');
  const { id } = req.query;
  const session = getSessionFromReq(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const userId = session.id;
  const { rating } = req.body || {};
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ error: 'invalid_rating' });
  try {
    await prisma.$transaction(async (tx) => {
      const prevRows = await tx.$queryRaw`
        SELECT value FROM "Rating" WHERE "userId" = ${userId} AND "commandId" = ${id} LIMIT 1 FOR UPDATE
      `;
      if (Array.isArray(prevRows) && prevRows.length) {
        const prev = Number(prevRows[0].value);
        await tx.$executeRaw`
          UPDATE "Rating" SET value = ${r}, "createdAt" = now() WHERE "userId" = ${userId} AND "commandId" = ${id}
        `;
        await tx.$executeRaw`
          UPDATE "Command" SET rating = CASE WHEN "ratingCount" > 0 THEN ((rating * "ratingCount") - ${prev} + ${r})::double precision / "ratingCount" ELSE ${r} END WHERE id = ${id}
        `;
      } else {
        await tx.$executeRaw`
          INSERT INTO "Rating" ("userId","commandId",value) VALUES (${userId}, ${id}, ${r})
        `;
        await tx.$executeRaw`
          UPDATE "Command" SET rating = ((rating * "ratingCount") + ${r})::double precision / ("ratingCount" + 1), "ratingCount" = "ratingCount" + 1 WHERE id = ${id}
        `;
      }
    });
    const cmd = await prisma.command.findUnique({ where: { id } });
    if (!cmd) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true, rating: cmd.rating, ratingCount: cmd.ratingCount, myRating: r });
  } catch (err) {
    console.error('rate error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
}
