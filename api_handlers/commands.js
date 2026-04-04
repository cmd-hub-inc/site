import prisma from './_lib/prisma.js';
import { requireAuthOrFail } from './_lib/utils.js';

function parsePositiveInt(value, fallback, min = 1, max = 100) {
  const n = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeSort(sort) {
  if (sort === 'rating') return [{ rating: 'desc' }, { downloads: 'desc' }, { createdAt: 'desc' }];
  if (sort === 'newest') return [{ createdAt: 'desc' }];
  return [{ downloads: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }];
}

function parseTagFilters(rawTags) {
  if (!rawTags) return [];
  return String(rawTags)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function applyInMemoryQuery(rows, query) {
  const q = String(query.q || '').trim().toLowerCase();
  const framework = String(query.framework || '').trim();
  const type = String(query.type || '').trim();
  const uploadCategory = String(query.uploadCategory || '').trim().toLowerCase();
  const tags = parseTagFilters(query.tags);
  const tagsMode = String(query.tagsMode || 'all').toLowerCase();
  const sort = String(query.sort || 'downloads');
  const page = parsePositiveInt(query.page, 1, 1, 100000);
  const limit = parsePositiveInt(query.limit, 24, 1, 50);

  let filtered = Array.isArray(rows) ? [...rows] : [];

  if (q) {
    filtered = filtered.filter((cmd) => {
      const name = String(cmd.name || '').toLowerCase();
      const desc = String(cmd.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }

  if (framework) {
    filtered = filtered.filter((cmd) => String(cmd.framework || '') === framework);
  }

  if (type) {
    filtered = filtered.filter((cmd) => String(cmd.type || '') === type);
  }

  if (uploadCategory) {
    filtered = filtered.filter(
      (cmd) => String(cmd.uploadCategory || 'Framework').toLowerCase() === uploadCategory,
    );
  }

  if (tags.length > 0) {
    filtered = filtered.filter((cmd) => {
      const cmdTags = Array.isArray(cmd.tags) ? cmd.tags : [];
      if (tagsMode === 'some') return tags.some((tag) => cmdTags.includes(tag));
      return tags.every((tag) => cmdTags.includes(tag));
    });
  }

  filtered.sort((a, b) => {
    if (sort === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    return (Number(b.downloads) || 0) - (Number(a.downloads) || 0);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return {
    items,
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
    },
  };
}

async function listCommands(req, res) {
  const query = req.query || {};
  const includeMeta = ['1', 'true', 'yes'].includes(
    String(query.includeMeta || '').toLowerCase(),
  );

  const page = parsePositiveInt(query.page, 1, 1, 100000);
  const limit = parsePositiveInt(query.limit, 24, 1, 50);
  const q = String(query.q || '').trim();
  const framework = String(query.framework || '').trim();
  const type = String(query.type || '').trim();
  const uploadCategory = String(query.uploadCategory || '').trim();
  const tags = parseTagFilters(query.tags);
  const tagsMode = String(query.tagsMode || 'all').toLowerCase();
  const sort = String(query.sort || 'downloads');

  try {
    if (!includeMeta) {
      const cmds = await prisma.command.findMany({ include: { author: true } });
      const out = cmds.map((c) => ({ ...c, uploadCategory: c.uploadCategory || 'Framework' }));
      return res.json(out);
    }

    const where = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (framework) {
      where.framework = framework;
    }

    if (type) {
      where.type = type;
    }

    if (uploadCategory) {
      where.uploadCategory = uploadCategory;
    }

    if (tags.length > 0) {
      where.tags = tagsMode === 'some' ? { hasSome: tags } : { hasEvery: tags };
    }

    const [items, total] = await prisma.$transaction([
      prisma.command.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: normalizeSort(sort),
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.command.count({ where }),
    ]);

    const normalizedItems = items.map((c) => ({ ...c, uploadCategory: c.uploadCategory || 'Framework' }));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return res.json({
      items: normalizedItems,
      pagination: {
        page: Math.min(page, totalPages),
        limit,
        total,
        totalPages,
      },
    });
  } catch (prismaErr) {
    console.warn(
      '[api] Prisma findMany failed, falling back to raw SQL:',
      prismaErr && prismaErr.message ? prismaErr.message : prismaErr,
    );
    try {
      const rows = await prisma.$queryRaw`
        SELECT c.*, u.id as author_id, u.username as author_username, u.avatar as author_avatar
        FROM "Command" c
        LEFT JOIN "User" u ON c."authorId" = u.id
        ORDER BY c."createdAt" DESC
      `;
      const out = (Array.isArray(rows) ? rows : []).map((r) => {
        return {
          id: r.id,
          name: r.name,
          description: r.description,
          type: r.type,
          framework: r.framework,
          version: r.version,
          tags: r.tags || [],
          githubUrl: r.githubUrl || r.GithubUrl || r.githuburl || null,
          websiteUrl: r.websiteUrl || r.websiteurl || null,
          downloads: Number(r.downloads || 0),
          rating: Number(r.rating || 0),
          ratingCount: Number(r.ratingCount || r.ratingcount || 0),
          favourites: Number(r.favourites || 0),
          views: Number(r.views || 0),
          changelog: r.changelog || null,
          rawData: r.rawData || r.rawdata || '{}',
          createdAt: r.createdAt || r.createdat,
          updatedAt: r.updatedAt || r.updatedat,
          author: { id: r.author_id, username: r.author_username, avatar: r.author_avatar },
          uploadCategory: r.uploadCategory || r.uploadcategory || 'Framework',
        };
      });

      if (!includeMeta) {
        return res.json(out);
      }

      const queried = applyInMemoryQuery(out, {
        q,
        framework,
        type,
        uploadCategory,
        tags: tags.join(','),
        tagsMode,
        sort,
        page,
        limit,
      });

      return res.json(queried);
    } catch (rawErr) {
      console.error(
        'raw SQL fallback failed for /api/commands',
        rawErr && rawErr.message ? rawErr.message : rawErr,
      );
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

async function createCommand(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;
  try {
    const data = req.body || {};
    const authorId = session.id;
    const createData = {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      framework: data.framework,
      version: data.version,
      tags: Array.isArray(data.tags) ? data.tags : [],
      githubUrl: data.githubUrl || null,
      websiteUrl: data.websiteUrl || null,
      changelog: data.changelog || null,
      rawData: data.rawData || '{}',
      authorId,
    };

    if (data.uploadCategory) {
      createData.uploadCategory = data.uploadCategory;
    }

    let cmd = null;
    try {
      cmd = await prisma.command.create({ data: createData });
    } catch (e) {
      const msg = (e && e.message) || String(e);
      if (msg.includes('uploadCategory') || msg.includes('does not exist')) {
        try {
          const retryData = { ...createData };
          delete retryData.uploadCategory;
          cmd = await prisma.command.create({ data: retryData });
        } catch (rawErr) {
          console.error(
            'safe create retry failed',
            rawErr && rawErr.message ? rawErr.message : rawErr,
          );
          return res.status(500).json({ error: 'Server error' });
        }
      } else {
        throw e;
      }
    }
    // attach uploadCategory if present
    if (data.uploadCategory) {
      try {
        await prisma.$executeRaw`
          UPDATE "Command" SET "uploadCategory" = ${data.uploadCategory} WHERE id = ${cmd.id}
        `;
      } catch (ue) {}
    }
    try {
      const urows = await prisma.$queryRaw`
        SELECT "uploadCategory" FROM "Command" WHERE id = ${cmd.id} LIMIT 1
      `;
      const uploadCategory =
        Array.isArray(urows) && urows.length
          ? urows[0].uploadCategory || urows[0].uploadcategory
          : 'Framework';
      const withAuthor = await prisma.command.findUnique({
        where: { id: cmd.id },
        include: { author: true },
      });
      return res.status(201).json({ ...withAuthor, uploadCategory });
    } catch (e) {
      return res.status(201).json(cmd);
    }
  } catch (err) {
    console.error('create command error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return listCommands(req, res);
  if (req.method === 'POST') return createCommand(req, res);
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
}
