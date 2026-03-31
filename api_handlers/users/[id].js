import prisma from '../_lib/prisma.js';

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method !== 'GET') return res.setHeader('Allow', 'GET') && res.status(405).end('Method Not Allowed');
  try {
    const urows = await prisma.$queryRaw`
      SELECT id, username, avatar FROM "User" WHERE id = ${id} LIMIT 1
    `;
    const user = Array.isArray(urows) && urows.length ? urows[0] : null;
    if (!user) return res.status(404).json({ error: 'not_found' });

    let followers = 0;
    let following = 0;
    try {
      const f1 = await prisma.$queryRaw`
        SELECT COUNT(*) AS cnt FROM "Follower" WHERE "followeeId" = ${id}
      `;
      const f2 = await prisma.$queryRaw`
        SELECT COUNT(*) AS cnt FROM "Follower" WHERE "followerId" = ${id}
      `;
      followers = Array.isArray(f1) && f1.length ? Number(f1[0].cnt || 0) : 0;
      following = Array.isArray(f2) && f2.length ? Number(f2[0].cnt || 0) : 0;
    } catch (e) {}

    const top = await prisma.$queryRaw`
      SELECT c.* FROM "Command" c WHERE c."authorId" = ${id} ORDER BY c.downloads DESC NULLS LAST LIMIT 8
    `;
    return res.json({ user: { id: user.id, username: user.username, avatar: user.avatar, followers, following }, top: Array.isArray(top) ? top : [] });
  } catch (err) {
    console.error('user profile error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
}
