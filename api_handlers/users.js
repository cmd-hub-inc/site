import prisma from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const sql = `
      SELECT u.id, u.username, u.avatar,
        (SELECT COUNT(*) FROM "Command" c WHERE c."authorId" = u.id) AS commands,
        (SELECT COALESCE(SUM(downloads),0) FROM "Command" c WHERE c."authorId" = u.id) AS downloads,
        (SELECT COALESCE(ROUND(AVG(NULLIF(rating,0))::numeric,2),0) FROM "Command" c WHERE c."authorId" = u.id) AS avg_rating
      FROM "User" u
      ORDER BY commands DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;
    if (String(process.env.DEBUG_SQL).toLowerCase() === 'true') {
      console.log('[api] users list SQL:', sql.replace(/\s+/g, ' ').trim());
    }
    let rows = [];
    try {
      rows = await prisma.$queryRawUnsafe(sql);
    } catch (queryErr) {
      console.warn(
        '[api] prisma.$queryRawUnsafe failed for /api/users, falling back to Prisma client findMany',
        queryErr && queryErr.message ? queryErr.message : queryErr,
      );
      try {
        rows = await prisma.user.findMany({
          select: { id: true, username: true, avatar: true },
          skip: offset,
          take: limit,
        });
        rows = (rows || []).map((r) => ({
          id: r.id,
          username: r.username,
          avatar: r.avatar,
          commands: 0,
          downloads: 0,
          avg_rating: 0,
        }));
      } catch (clientErr) {
        console.error(
          '[api] fallback findMany also failed for /api/users',
          clientErr && clientErr.stack ? clientErr.stack : clientErr,
        );
        throw clientErr;
      }
    }

    const countRes = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS cnt FROM "User"');
    const total = Array.isArray(countRes) && countRes.length ? Number(countRes[0].cnt || 0) : 0;

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
    console.error(
      'users list error',
      err && err.stack ? err.stack : err && err.message ? err.message : err,
    );
    return res.status(500).json({ error: 'failed' });
  }
}
