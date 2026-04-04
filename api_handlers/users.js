import prisma from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const rawSearch = String(req.query.q || '').trim();
    const sort = String(req.query.sort || 'commands_desc');
    const where = rawSearch
      ? {
          username: {
            contains: rawSearch,
            mode: 'insensitive',
          },
        }
      : {};

    const users = await prisma.user.findMany({
      where,
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

    const rows = (users || [])
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
      .sort((left, right) => {
        switch (sort) {
          case 'downloads_desc':
            return (
              (Number(right.downloads) || 0) - (Number(left.downloads) || 0) ||
              String(left.username || '').localeCompare(String(right.username || ''))
            );
          case 'rating_desc':
            return (
              (Number(right.avg_rating) || 0) - (Number(left.avg_rating) || 0) ||
              String(left.username || '').localeCompare(String(right.username || ''))
            );
          case 'alpha_asc':
            return String(left.username || '').localeCompare(String(right.username || ''));
          case 'alpha_desc':
            return String(right.username || '').localeCompare(String(left.username || ''));
          case 'commands_desc':
          default:
            return (
              (Number(right.commands) || 0) - (Number(left.commands) || 0) ||
              String(left.username || '').localeCompare(String(right.username || ''))
            );
        }
      });

    const total = await prisma.user.count({ where });
    const pagedRows = rows.slice(offset, offset + limit);

    const normalized = (Array.isArray(pagedRows) ? pagedRows : []).map((r) => {
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
