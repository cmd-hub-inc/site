import prisma from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const rawSearch = String(req.query.q || '').trim();
    const search = rawSearch ? rawSearch.replace(/\\/g, '\\\\').replace(/'/g, "''") : '';
    const sort = String(req.query.sort || 'commands_desc');
    const sortClauses = {
      commands_desc: 'commands DESC NULLS LAST, u.username ASC NULLS LAST',
      downloads_desc: 'downloads DESC NULLS LAST, u.username ASC NULLS LAST',
      rating_desc: 'avg_rating DESC NULLS LAST, u.username ASC NULLS LAST',
      alpha_asc: 'u.username ASC NULLS LAST',
      alpha_desc: 'u.username DESC NULLS LAST',
    };
    const orderBy = sortClauses[sort] || sortClauses.commands_desc;
    const searchClause = search ? `WHERE u.username ILIKE '%${search}%'` : '';
    const sql = `
      SELECT u.id, u.username, u.avatar,
        (SELECT COUNT(*) FROM "Command" c WHERE c."authorId" = u.id) AS commands,
        (SELECT COALESCE(SUM(downloads),0) FROM "Command" c WHERE c."authorId" = u.id) AS downloads,
        (SELECT COALESCE(ROUND(AVG(NULLIF(rating,0))::numeric,2),0) FROM "Command" c WHERE c."authorId" = u.id) AS avg_rating
      FROM "User" u
      ${searchClause}
      ORDER BY ${orderBy}
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
        const users = await prisma.user.findMany({
          select: {
            id: true,
            username: true,
            avatar: true,
            commands: {
              select: {
                downloads: true,
                rating: true,
              },
            },
          },
        });

        const normalizedSearch = rawSearch.toLowerCase();
        rows = (users || [])
          .map((user) => {
            const commands = Array.isArray(user.commands) ? user.commands : [];
            const commandCount = commands.length;
            const downloads = commands.reduce((sum, command) => sum + Number(command.downloads || 0), 0);
            const ratings = commands.map((command) => Number(command.rating || 0)).filter((value) => value > 0);
            const avgRating = ratings.length
              ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
              : 0;

            return {
              id: user.id,
              username: user.username,
              avatar: user.avatar,
              commands: commandCount,
              downloads,
              avg_rating: avgRating,
            };
          })
          .filter((user) => {
            if (!normalizedSearch) return true;
            return String(user.username || '').toLowerCase().includes(normalizedSearch);
          })
          .sort((left, right) => {
            switch (sort) {
              case 'downloads_desc':
                return (Number(right.downloads) || 0) - (Number(left.downloads) || 0) || String(left.username || '').localeCompare(String(right.username || ''));
              case 'rating_desc':
                return (Number(right.avg_rating) || 0) - (Number(left.avg_rating) || 0) || String(left.username || '').localeCompare(String(right.username || ''));
              case 'alpha_asc':
                return String(left.username || '').localeCompare(String(right.username || ''));
              case 'alpha_desc':
                return String(right.username || '').localeCompare(String(left.username || ''));
              case 'commands_desc':
              default:
                return (Number(right.commands) || 0) - (Number(left.commands) || 0) || String(left.username || '').localeCompare(String(right.username || ''));
            }
          });

        const totalRows = rows.length;
        rows = rows.slice(offset, offset + limit);
        const countRes = [{ cnt: totalRows }];
        const normalized = (Array.isArray(rows) ? rows : []).map((r) => {
          const obj = {};
          for (const [k, v] of Object.entries(r || {})) {
            if (typeof v === 'bigint') obj[k] = Number(v);
            else obj[k] = v;
          }
          return obj;
        });

        return res.json({ users: normalized, page, limit, total: Number(countRes[0].cnt || 0) });
      } catch (clientErr) {
        console.error(
          '[api] fallback findMany also failed for /api/users',
          clientErr && clientErr.stack ? clientErr.stack : clientErr,
        );
        throw clientErr;
      }
    }

    const countSql = `SELECT COUNT(*) AS cnt FROM "User" u ${searchClause}`;
    const countRes = await prisma.$queryRawUnsafe(countSql);
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
