/**
 * Collections management handler
 */

import prisma from '../_lib/prisma.js';
import { requireAuthOrFail } from '../_lib/utils.js';
import { deleteCache, invalidateCachePattern } from '../_lib/cache.js';
import { logError, logInfo } from '../_lib/logger.js';

/**
 * List collections - GET /api/collections
 * Query params: userId (optional - filter by creator), limit, page
 */
export async function listCollections(req, res) {
  try {
    const { userId, limit = 20, page = 1 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    const where = userId ? { createdBy: userId } : {};

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          creator: {
            select: { id: true, username: true, avatar: true },
          },
          collectionCommands: {
            select: { commandId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.collection.count({ where }),
    ]);

    const result = collections.map((c) => ({
      ...c,
      commandCount: c.collectionCommands.length,
      collectionCommands: undefined, // Remove the array from response
    }));

    return res.json({
      data: result,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logError('Failed to list collections', error);
    return res.status(500).json({ error: 'Failed to list collections' });
  }
}

/**
 * Create a collection - POST /api/collections
 */
export async function createCollection(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Collection name must be less than 100 characters' });
    }

    if (description && description.length > 500) {
      return res.status(400).json({ error: 'Description must be less than 500 characters' });
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        createdBy: session.id,
      },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    logInfo('Collection created', { collectionId: collection.id, userId: session.id });

    return res.status(201).json({
      ...collection,
      commandCount: 0,
    });
  } catch (error) {
    logError('Failed to create collection', error, { userId: session.id });
    return res.status(500).json({ error: 'Failed to create collection' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return listCollections(req, res);
  } else if (req.method === 'POST') {
    return createCollection(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
