/**
 * Collection commands management handler
 */

import prisma from '../../../_lib/prisma.js';
import { requireAuthOrFail } from '../../../_lib/utils.js';
import { logError, logInfo } from '../../../_lib/logger.js';

/**
 * Add command to collection - POST /api/collections/[id]/commands
 */
export async function addCommandToCollection(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { id: collectionId } = req.query;
    const { commandId } = req.body;

    if (!collectionId || typeof collectionId !== 'string') {
      return res.status(400).json({ error: 'Collection ID is required' });
    }

    if (!commandId || typeof commandId !== 'string') {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    // Check if collection exists and user is the owner
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collection.createdBy !== session.id) {
      return res.status(403).json({ error: 'Not authorized to modify this collection' });
    }

    // Check if command exists
    const command = await prisma.command.findUnique({
      where: { id: commandId },
    });

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // Check if already in collection
    const existing = await prisma.collectionCommand.findUnique({
      where: {
        collectionId_commandId: { collectionId, commandId },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Command already in collection' });
    }

    // Add to collection
    const collectionCommand = await prisma.collectionCommand.create({
      data: { collectionId, commandId },
      include: {
        command: { include: { author: true } },
      },
    });

    logInfo('Command added to collection', { collectionId, commandId, userId: session.id });

    return res.status(201).json(collectionCommand.command);
  } catch (error) {
    logError('Failed to add command to collection', error, {
      collectionId: req.query.id,
      userId: session.id,
    });
    return res.status(500).json({ error: 'Failed to add command to collection' });
  }
}

/**
 * Remove command from collection - DELETE /api/collections/[id]/commands/[commandId]
 */
export async function removeCommandFromCollection(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { id: collectionId, commandId } = req.query;

    if (!collectionId || typeof collectionId !== 'string') {
      return res.status(400).json({ error: 'Collection ID is required' });
    }

    if (!commandId || typeof commandId !== 'string') {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    // Check if collection exists and user is the owner
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collection.createdBy !== session.id) {
      return res.status(403).json({ error: 'Not authorized to modify this collection' });
    }

    // Check if in collection
    const existing = await prisma.collectionCommand.findUnique({
      where: {
        collectionId_commandId: { collectionId, commandId },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Command not in collection' });
    }

    // Remove from collection
    await prisma.collectionCommand.delete({
      where: {
        collectionId_commandId: { collectionId, commandId },
      },
    });

    logInfo('Command removed from collection', { collectionId, commandId, userId: session.id });

    return res.json({ success: true });
  } catch (error) {
    logError('Failed to remove command from collection', error, {
      collectionId: req.query.id,
      userId: session.id,
    });
    return res.status(500).json({ error: 'Failed to remove command from collection' });
  }
}

export default async function handler(req, res) {
  const { commandId } = req.query;

  if (req.method === 'POST') {
    return addCommandToCollection(req, res);
  } else if (req.method === 'DELETE' && commandId) {
    return removeCommandFromCollection(req, res);
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
