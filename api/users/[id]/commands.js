import prisma from '../../../_lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.setHeader('Allow', 'GET') && res.status(405).end('Method Not Allowed');
  const { id } = req.query;
  try {
    try {
      const cmds = await prisma.command.findMany({ where: { authorId: id }, include: { author: true } });
      try {
        const ids = cmds.map((c) => c.id).filter(Boolean);
        if (ids.length === 0) return res.json(cmds);
        const urows = await prisma.$queryRaw`
          SELECT id, "uploadCategory" FROM "Command" WHERE id = ANY(${ids})
        `;
        const map = {};
        if (Array.isArray(urows)) urows.forEach((r) => (map[r.id] = r.uploadCategory || r.uploadcategory));
        const out = cmds.map((c) => ({ ...c, uploadCategory: map[c.id] || 'Framework' }));
        return res.json(out);
      } catch (e) {
        return res.json(cmds);
      }
    } catch (prismaErr) {
      console.warn('[api] Prisma findMany failed for user commands, falling back to raw SQL:', prismaErr && prismaErr.message ? prismaErr.message : prismaErr);
      const rows = await prisma.$queryRaw`
        SELECT c.*, u.id as author_id, u.username as author_username, u.avatar as author_avatar
        FROM "Command" c LEFT JOIN "User" u ON c."authorId" = u.id
        WHERE c."authorId" = ${id}
        ORDER BY c."createdAt" DESC
      `;
      const out = (Array.isArray(rows) ? rows : []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.type,
        framework: r.framework,
        version: r.version,
        tags: r.tags || [],
        githubUrl: r.githubUrl || null,
        websiteUrl: r.websiteUrl || null,
        downloads: Number(r.downloads || 0),
        rating: Number(r.rating || 0),
        ratingCount: Number(r.ratingCount || r.ratingcount || 0),
        favourites: Number(r.favourites || 0),
        views: Number(r.views || 0),
        changelog: r.changelog || null,
        rawData: r.rawData || '{}',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        author: { id: r.author_id, username: r.author_username, avatar: r.author_avatar },
        uploadCategory: r.uploadCategory || r.uploadcategory || 'Framework',
      }));
      return res.json(out);
    }
  } catch (err) {
    console.error('user commands error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
}
