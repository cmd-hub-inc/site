import prisma from '../../_lib/prisma.js';
import { getSessionFromReq } from '../../_lib/utils.js';

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    if (req.method === 'GET') {
      let updated;
      try {
        updated = await prisma.command.update({
          where: { id },
          data: { views: { increment: 1 } },
          include: { author: true },
        });
      } catch (prismaErr) {
        try {
          const rows = await prisma.$queryRaw`
            UPDATE "Command" SET views = COALESCE(views,0) + 1 WHERE id = ${id} RETURNING *
          `;
          const row = Array.isArray(rows) && rows.length ? rows[0] : null;
          if (!row) return res.status(404).json({ error: 'Not found' });
          const auth = await prisma.$queryRaw`
            SELECT id, username, avatar FROM "User" WHERE id = ${row.authorId} LIMIT 1
          `;
          updated = { ...row, author: auth && auth[0] ? { id: auth[0].id, username: auth[0].username, avatar: auth[0].avatar } : null };
        } catch (rawErr) {
          console.error('raw SQL fallback failed for increment views', rawErr && rawErr.message ? rawErr.message : rawErr);
          return res.status(500).json({ error: 'failed' });
        }
      }

      const sessionUser = getSessionFromReq(req);
      if (sessionUser && sessionUser.id) {
        try {
          const rows = await prisma.$queryRaw`
            SELECT value FROM "Rating" WHERE "userId" = ${sessionUser.id} AND "commandId" = ${id} LIMIT 1
          `;
          const myRating = Array.isArray(rows) && rows.length ? Number(rows[0].value) : null;
          try {
            const urows = await prisma.$queryRaw`
              SELECT "uploadCategory" FROM "Command" WHERE id = ${id} LIMIT 1
            `;
            const uploadCategory = Array.isArray(urows) && urows.length ? urows[0].uploadCategory || urows[0].uploadcategory : 'Framework';
            return res.json({ ...updated, myRating, uploadCategory });
          } catch (e) {
            return res.json({ ...updated, myRating, uploadCategory: 'Framework' });
          }
        } catch (e) {
          return res.json({ ...updated, myRating: null, uploadCategory: 'Framework' });
        }
      }

      try {
        const urows = await prisma.$queryRaw`
          SELECT "uploadCategory" FROM "Command" WHERE id = ${id} LIMIT 1
        `;
        const uploadCategory = Array.isArray(urows) && urows.length ? urows[0].uploadCategory || urows[0].uploadcategory : 'Framework';
        return res.json({ ...updated, uploadCategory });
      } catch (e) {
        return res.json({ ...updated, uploadCategory: 'Framework' });
      }
    }

    if (req.method === 'PUT') {
      const sessionUser = getSessionFromReq(req);
      if (!sessionUser) return res.status(401).json({ error: 'Not authenticated' });
      const existing = await prisma.command.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const adminList = process.env.ADMIN_IDS ? String(process.env.ADMIN_IDS).split(',').map((s) => s.trim()) : [];
      const isAdmin = sessionUser && adminList.includes(sessionUser.id);
      if (!(sessionUser && (sessionUser.id === existing.authorId || isAdmin))) return res.status(403).json({ error: 'forbidden' });
      const body = req.body || {};
      const updatable = {};
      const fields = [
        'name','description','type','framework','version','tags','githubUrl','websiteUrl','changelog','rawData','uploadCategory',
      ];
      for (const f of fields) if (Object.prototype.hasOwnProperty.call(body, f)) updatable[f] = body[f];
      if (updatable.tags && typeof updatable.tags === 'string') {
        try { updatable.tags = updatable.tags.split(',').map((t) => t.trim()).filter(Boolean); } catch (e) { updatable.tags = []; }
      }
      const updated = await prisma.command.update({ where: { id }, data: { ...updatable } });
      const withAuthor = await prisma.command.findUnique({ where: { id }, include: { author: true } });
      return res.json(withAuthor);
    }

    return res.setHeader('Allow', 'GET, PUT') && res.status(405).end('Method Not Allowed');
  } catch (err) {
    console.error('command by id error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
}
