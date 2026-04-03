import prisma from '../../_lib/prisma.js';
import { verifyToken } from '../../_lib/jwt.js';

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

export default async function handler(req, res) {
  try {
    console.log('[admin/news] Handling', req.method, req.url);
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies.session;
    if (!token) {
      console.log('[admin/news] No token found');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = verifyToken(token);
    if (!session) {
      console.log('[admin/news] Invalid token');
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user from database to check admin status
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true, isAdmin: true, adminRole: true },
      });

      if (!user || !user.isAdmin) {
        console.log('[admin/news] User not admin');
        return res.status(403).json({ error: 'Access denied' });
      }

      // GET - Get all news (published and unpublished for admin)
      if (req.method === 'GET') {
        try {
          const news = await prisma.news.findMany({
            include: {
              author: { select: { id: true, username: true, avatar: true } },
            },
            orderBy: { createdAt: 'desc' },
          });

          console.log('[admin/news] Found', news.length, 'news items');
          return res.json({
            news: news.map((n) => ({
              id: n.id,
              title: n.title,
              content: n.content,
              published: n.published,
              publishedAt: n.publishedAt,
              author: n.author.username,
              authorId: n.author.id,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
            })),
          });
        } catch (dbErr) {
          console.error('[admin/news] GET Database error:', dbErr.message, dbErr);
          return res.status(500).json({ error: 'Database error: ' + dbErr.message });
        }
      }

      // POST - Create new news
      if (req.method === 'POST') {
        const { title, content, published } = req.body || {};

        if (!title || !content) {
          return res.status(400).json({ error: 'Title and content are required' });
        }

        try {
          const news = await prisma.news.create({
            data: {
              title,
              content,
              published: published || false,
              publishedAt: published ? new Date() : null,
              createdBy: user.id,
            },
            include: {
              author: { select: { id: true, username: true, avatar: true } },
            },
          });

          console.log('[admin/news] Created news:', news.id);
          return res.status(201).json({
            id: news.id,
            title: news.title,
            content: news.content,
            published: news.published,
            publishedAt: news.publishedAt,
            author: news.author.username,
            authorId: news.author.id,
            createdAt: news.createdAt,
          });
        } catch (dbErr) {
          console.error('[admin/news] POST Database error:', dbErr.message, dbErr);
          return res.status(500).json({ error: 'Database error: ' + dbErr.message });
        }
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (userError) {
      console.error('[admin/news] User lookup error:', userError.message, userError);
      return res.status(500).json({ error: 'User lookup error: ' + userError.message });
    }
  } catch (error) {
    console.error('[admin/news] Handler error:', error.message, error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
