import prisma from '../_lib/prisma.js';

export default async function handler(req, res) {
  try {
    // GET /api/news - Get all published news with optional filtering
    if (req.method === 'GET') {
      try {
        const { type, sortBy = 'publishedAt' } = req.query;
        
        const where = { published: true };
        if (type) {
          where.type = String(type).toLowerCase();
        }

        const orderBy = {};
        if (sortBy === 'type') {
          orderBy.type = 'asc';
        } else {
          orderBy[sortBy] = 'desc';
        }

        const news = await prisma.news.findMany({
          where,
          include: {
            author: { select: { id: true, username: true, avatar: true } },
          },
          orderBy,
        });

        console.log('[news] Found', news.length, 'published news items');
        return res.json({
          news: news.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            type: n.type,
            author: n.author.username,
            authorId: n.author.id,
            authorAvatar: n.author.avatar,
            publishedAt: n.publishedAt,
          })),
        });
      } catch (dbErr) {
        console.error('[news] Database error:', dbErr.message);
        // If table doesn't exist yet, return empty news list
        if (dbErr.message.includes('does not exist')) {
          console.log('[news] News table does not exist yet, returning empty list');
          return res.json({ news: [] });
        }
        return res.status(500).json({ error: 'Database error: ' + dbErr.message });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[news] Handler error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
