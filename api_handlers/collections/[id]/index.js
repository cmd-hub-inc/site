/**
 * Collection detail handler
 */

import prisma from '../../_lib/prisma.js';
import { requireAuthOrFail } from '../../_lib/utils.js';
import { deleteCache, invalidateCachePattern } from '../../_lib/cache.js';
import { logError, logInfo } from '../../_lib/logger.js';

/**
 * Get collection details - GET /api/collections/[id]
 */
export async function getCollection(req, res) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Collection ID is required' });
    }

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        collectionCommands: {
          include: { command: { include: { author: true } } },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const result = {
      ...collection,
      commands: collection.collectionCommands.map((cc) => cc.command),
      commandCount: collection.collectionCommands.length,
      collectionCommands: undefined,
    };

    return res.json(result);
  } catch (error) {
    logError('Failed to get collection', error, { collectionId: req.query.id });
    return res.status(500).json({ error: 'Failed to get collection' });
  }
}

/**
 * Update collection - PATCH /api/collections/[id]
 */
export async function updateCollection(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { id } = req.query;
    const { name, description } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Collection ID is required' });
    }

    // Check if collection exists and user is the owner
    const existing = await prisma.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (existing.createdBy !== session.id) {
      return res.status(403).json({ error: 'Not authorized to update this collection' });
    }

    // Validate inputs
    const updateData = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Collection name is required' });
      }
      if (name.length > 100) {
        return res.status(400).json({ error: 'Collection name must be less than 100 characters' });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      if (description && description.length > 500) {
        return res.status(400).json({ error: 'Description must be less than 500 characters' });
      }
      updateData.description = description ? description.trim() : null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const collection = await prisma.collection.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    logInfo('Collection updated', { collectionId: id, userId: session.id });

    return res.json(collection);
  } catch (error) {
    logError('Failed to update collection', error, { collectionId: req.query.id, userId: session.id });
    return res.status(500).json({ error: 'Failed to update collection' });
  }
}

/**
 * Delete collection - DELETE /api/collections/[id]
 */
export async function deleteCollection(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Collection ID is required' });
    }

    // Check if collection exists and user is the owner
    const existing = await prisma.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (existing.createdBy !== session.id) {
      return res.status(403).json({ error: 'Not authorized to delete this collection' });
    }

    await prisma.collection.delete({
      where: { id },
    });

    logInfo('Collection deleted', { collectionId: id, userId: session.id });

    return res.json({ success: true });
  } catch (error) {
    logError('Failed to delete collection', error, { collectionId: req.query.id, userId: session.id });
    return res.status(500).json({ error: 'Failed to delete collection' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return getCollection(req, res);
  } else if (req.method === 'PATCH' || req.method === 'PUT') {
    return updateCollection(req, res);
  } else if (req.method === 'DELETE') {
    return deleteCollection(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
