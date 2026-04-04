import prisma from './_lib/prisma.js';
import { requireAuthOrFail } from './_lib/utils.js';

async function listCommands(req, res) {
  try {
    const cmds = await prisma.command.findMany({ include: { author: true } });
    const ids = cmds.map((c) => c.id).filter(Boolean);
    if (ids.length > 0) {
      const rows = await prisma.$queryRaw`
        SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
      `;
      const map = {};
      if (Array.isArray(rows))
        rows.forEach(
          (r) =>
            (map[r.id || r.ID || Object.values(r)[0]] =
              r.uploadCategory || r.uploadcategory || r.UploadCategory),
        );
      const out = cmds.map((c) => ({ ...c, uploadCategory: map[c.id] || 'Framework' }));
      return res.json(out);
    }
    return res.json(cmds);
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
      return res.json(out);
    } catch (rawErr) {
      console.error(
        'raw SQL fallback failed for /api/commands',
        rawErr && rawErr.message ? rawErr.message : rawErr,
      );
      return res.status(500).json({ error: 'failed' });
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
          return res.status(500).json({ error: 'failed_to_create_command' });
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
    return res.status(500).json({ error: 'failed' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return listCommands(req, res);
  if (req.method === 'POST') return createCommand(req, res);
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
}
