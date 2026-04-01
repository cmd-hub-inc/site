/**
 * Share tracking handler for social sharing
 */

import prisma from './_lib/prisma.js';
import { logError, logInfo } from './_lib/logger.js';
import { deleteCache, invalidateCachePattern } from './_lib/cache.js';
import { v4 as uuidv4 } from 'crypto';

const VALID_PLATFORMS = ['twitter', 'facebook', 'linkedin', 'discord', 'reddit'];

/**
 * Track a share event
 */
export async function trackShare(req, res) {
  try {
    const { commandId, platform } = req.body || {};
    const session = req.session?.user;

    if (!commandId) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
    }

    // Check if command exists
    const command = await prisma.command.findUnique({ where: { id: commandId } });
    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // Record share
    const share = await prisma.share.create({
      data: {
        commandId,
        platform,
        userId: session?.id || null,
      },
    });

    logInfo('Share tracked', { commandId, platform, userId: session?.id });

    // Invalidate cache for this command's analytics
    await deleteCache(`command:${commandId}`);

    return res.status(201).json(share);
  } catch (error) {
    logError('Failed to track share', error);
    return res.status(500).json({ error: 'Failed to track share' });
  }
}

/**
 * Get share statistics for a command
 */
export async function getCommandShares(req, res) {
  try {
    const { commandId } = req.params;

    if (!commandId) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    const shares = await prisma.share.groupBy({
      by: ['platform'],
      where: { commandId },
      _count: true,
    });

    const total = await prisma.share.count({ where: { commandId } });

    const result = {
      total,
      byPlatform: shares.reduce((acc, item) => {
        acc[item.platform] = item._count;
        return acc;
      }, {}),
    };

    return res.json(result);
  } catch (error) {
    logError('Failed to get share stats', error);
    return res.status(500).json({ error: 'Failed to get share stats' });
  }
}

/**
 * Get creator's total shares
 */
export async function getCreatorShares(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get all shares for commands by this user
    const commands = await prisma.command.findMany({
      where: { authorId: userId },
      select: { id: true },
    });

    const commandIds = commands.map(c => c.id);

    if (commandIds.length === 0) {
      return res.json({
        total: 0,
        byPlatform: {},
        byCommand: {},
      });
    }

    // Get all shares for creator's commands by platform
    const sharesByPlatform = await prisma.share.groupBy({
      by: ['platform'],
      where: { commandId: { in: commandIds } },
      _count: true,
    });

    // Get all shares for creator's commands by command
    const sharesByCommand = await prisma.share.groupBy({
      by: ['commandId'],
      where: { commandId: { in: commandIds } },
      _count: true,
    });

    const total = await prisma.share.count({
      where: { commandId: { in: commandIds } },
    });

    return res.json({
      total,
      byPlatform: sharesByPlatform.reduce((acc, item) => {
        acc[item.platform] = item._count;
        return acc;
      }, {}),
      byCommand: sharesByCommand.reduce((acc, item) => {
        acc[item.commandId] = item._count;
        return acc;
      }, {}),
    });
  } catch (error) {
    logError('Failed to get creator shares', error);
    return res.status(500).json({ error: 'Failed to get creator shares' });
  }
}

export default {
  trackShare,
  getCommandShares,
  getCreatorShares,
};
