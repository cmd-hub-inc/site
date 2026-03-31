import prisma from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    const cmds = await prisma.command.findMany({ include: { author: true } });
    const ids = cmds.map((c) => c.id).filter(Boolean);
    if (ids.length > 0) {
      const rows = await prisma.$queryRaw`
        SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
      `;
      const map = {};
      if (Array.isArray(rows)) rows.forEach((r) => (map[r.id || r.ID || Object.values(r)[0]] = r.uploadCategory || r.uploadcategory || r.UploadCategory));
      const out = cmds.map((c) => ({ ...c, uploadCategory: map[c.id] || 'Framework' }));
      return res.json(out);
    }
    return res.json(cmds);
  } catch (prismaErr) {
    console.warn('[api] Prisma findMany failed, falling back to raw SQL:', prismaErr && prismaErr.message ? prismaErr.message : prismaErr);
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
      console.error('raw SQL fallback failed for /api/commands', rawErr && rawErr.message ? rawErr.message : rawErr);
      return res.status(500).json({ error: 'failed' });
    }
  }
}
