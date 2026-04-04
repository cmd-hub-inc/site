/**
 * Favorites management handler
 */

import prisma from './_lib/prisma.js';
import { requireAuthOrFail } from './_lib/utils.js';
import { deleteCache, invalidateCachePattern } from './_lib/cache.js';
import { logError, logInfo } from './_lib/logger.js';
import { trackFavorite } from './_lib/analytics.js';

/**
 * Get user's favorite commands
 */
export async function getUserFavorites(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: session.id },
      include: { command: { include: { author: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const result = favorites.map((f) => f.command);

    return res.json(result);
  } catch (error) {
    logError('Failed to get user favorites', error, { userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Add command to favorites
 */
export async function addToFavorites(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { commandId } = req.params || req.body;
    if (!commandId) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    // Check if command exists
    const command = await prisma.command.findUnique({ where: { id: commandId } });
    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // Add to favorites
    const favorite = await prisma.favorite.upsert({
      where: {
        userId_commandId: { userId: session.id, commandId },
      },
      update: {},
      create: { userId: session.id, commandId },
    });

    // Increment favorites count
    await prisma.command.update({
      where: { id: commandId },
      data: { favourites: { increment: 1 } },
    });

    // Track analytics
    trackFavorite(commandId).catch((err) => logError('Failed to track favorite', err));

    // Invalidate caches
    await deleteCache(`command:${commandId}`);
    await invalidateCachePattern('commands:list:*');

    logInfo('Command favorited', { commandId, userId: session.id });

    return res.status(201).json(favorite);
  } catch (error) {
    logError('Failed to add to favorites', error, { userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Remove command from favorites
 */
export async function removeFromFavorites(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { commandId } = req.params || req.body;
    if (!commandId) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    // Check if favorite exists
    const favorite = await prisma.favorite.findUnique({
      where: { userId_commandId: { userId: session.id, commandId } },
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    // Remove from favorites
    await prisma.favorite.delete({
      where: { userId_commandId: { userId: session.id, commandId } },
    });

    // Decrement favorites count
    await prisma.command.update({
      where: { id: commandId },
      data: { favourites: { decrement: 1 } },
    });

    // Invalidate caches
    await deleteCache(`command:${commandId}`);
    await invalidateCachePattern('commands:list:*');

    logInfo('Command unfavorited', { commandId, userId: session.id });

    return res.json({ success: true });
  } catch (error) {
    logError('Failed to remove from favorites', error, { userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Check if command is favorited by user
 */
export async function isFavorited(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { commandId } = req.params;
    if (!commandId) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    const favorite = await prisma.favorite.findUnique({
      where: { userId_commandId: { userId: session.id, commandId } },
    });

    return res.json({ isFavorited: !!favorite });
  } catch (error) {
    logError('Failed to check favorite status', error, { userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

export default {
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  isFavorited,
};
