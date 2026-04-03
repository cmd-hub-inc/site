import prisma from '../../../_lib/prisma.js';
import { verifyToken } from '../../../_lib/jwt.js';

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
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies.session;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = verifyToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user from database to check admin status
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, isAdmin: true, adminRole: true },
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const newsId = req.query.id;
    if (!newsId) {
      return res.status(400).json({ error: 'News ID is required' });
    }

    // GET - Get a specific news item
    if (req.method === 'GET') {
      const news = await prisma.news.findUnique({
        where: { id: newsId },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
        },
      });

      if (!news) {
        return res.status(404).json({ error: 'News not found' });
      }

      return res.json({
        id: news.id,
        title: news.title,
        content: news.content,
        published: news.published,
        publishedAt: news.publishedAt,
        author: news.author.username,
        authorId: news.author.id,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt,
      });
    }

    // PUT - Update news
    if (req.method === 'PUT') {
      const { title, content, published } = req.body || {};

      const existingNews = await prisma.news.findUnique({
        where: { id: newsId },
      });

      if (!existingNews) {
        return res.status(404).json({ error: 'News not found' });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (published !== undefined) {
        updateData.published = published;
        updateData.publishedAt = published ? new Date() : null;
      }

      const news = await prisma.news.update({
        where: { id: newsId },
        data: updateData,
        include: {
          author: { select: { id: true, username: true, avatar: true } },
        },
      });

      return res.json({
        id: news.id,
        title: news.title,
        content: news.content,
        published: news.published,
        publishedAt: news.publishedAt,
        author: news.author.username,
        authorId: news.author.id,
        updatedAt: news.updatedAt,
      });
    }

    // DELETE - Delete news
    if (req.method === 'DELETE') {
      const existingNews = await prisma.news.findUnique({
        where: { id: newsId },
      });

      if (!existingNews) {
        return res.status(404).json({ error: 'News not found' });
      }

      await prisma.news.delete({
        where: { id: newsId },
      });

      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[admin/news/[id]]', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
