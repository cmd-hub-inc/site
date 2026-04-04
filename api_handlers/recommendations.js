/**
 * Recommendations handler
 * Provides personalized command recommendations based on browsing and favoriting history
 */

import prisma from './_lib/prisma.js';
import { requireAuthOrFail } from './_lib/utils.js';
import { getCache, setCache } from './_lib/cache.js';
import { logError, logInfo } from './_lib/logger.js';

/**
 * Record a command view in browse history
 * POST /api/recommendations/track-view
 * Body: { commandId }
 */
export async function trackView(req, res) {
  try {
    const user = requireAuthOrFail(req, res);
    const { commandId } = req.body;

    if (!commandId || typeof commandId !== 'string') {
      return res.status(400).json({ error: 'Valid commandId is required' });
    }

    // Verify command exists
    const command = await prisma.command.findUnique({ where: { id: commandId } });
    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // Record in browse history
    const record = await prisma.browseHistory.create({
      data: {
        userId: user.id,
        commandId,
      },
    });

    logInfo('Recorded command view', { userId: user.id, commandId });
    res.status(201).json({ success: true, id: record.id });
  } catch (error) {
    logError('Failed to track view', error);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get personalized recommendations for a user
 * GET /api/recommendations?limit=10
 * Returns commands recommended based on browsing/favoriting history
 */
export async function getRecommendations(req, res) {
  try {
    const user = requireAuthOrFail(req, res);
    const limit = Math.min(parseInt(req.query.limit || 10), 50);

    // Try cache first
    const cacheKey = `recommendations:${user.id}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get user's favorite commands
    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: { command: { select: { id: true, tags: true, type: true, framework: true } } },
      take: 20,
    });

    // Get user's recent browsing history
    const recentViews = await prisma.browseHistory.findMany({
      where: { userId: user.id },
      include: { command: { select: { id: true, tags: true, type: true, framework: true } } },
      orderBy: { viewedAt: 'desc' },
      take: 20,
    });

    // Extract tags, types, and frameworks from favorites and recent views
    const favoriteCommandIds = new Set(favorites.map((f) => f.command.id));
    const viewedCommandIds = new Set(recentViews.map((v) => v.command.id));
    const allViewedAndFavIds = new Set([...favoriteCommandIds, ...viewedCommandIds]);

    const tagsSet = new Set();
    const typesSet = new Set();
    const frameworksSet = new Set();

    // Collect tags/types/frameworks from favorites (weighted more heavily)
    favorites.forEach((f) => {
      if (f.command.tags) {
        f.command.tags.forEach((t) => tagsSet.add(t));
      }
      if (f.command.type) typesSet.add(f.command.type);
      if (f.command.framework) frameworksSet.add(f.command.framework);
    });

    // Collect tags/types/frameworks from recent views
    recentViews.forEach((v) => {
      if (v.command.tags) {
        v.command.tags.forEach((t) => tagsSet.add(t));
      }
      if (v.command.type) typesSet.add(v.command.type);
      if (v.command.framework) frameworksSet.add(v.command.framework);
    });

    const tags = Array.from(tagsSet);
    const types = Array.from(typesSet);
    const frameworks = Array.from(frameworksSet);

    // If user has no history, return popular commands
    if (favorites.length === 0 && recentViews.length === 0) {
      const popular = await prisma.command.findMany({
        where: { approved: true },
        orderBy: { downloads: 'desc' },
        take: limit,
        select: { id: true, name: true, description: true, type: true, framework: true, tags: true, downloads: true, rating: true, author: { select: { username: true } } },
      });
      await setCache(cacheKey, popular, 600); // Cache for 10 minutes
      return res.json(popular);
    }

    // Build recommendation query
    const where = {
      approved: true,
      id: { notIn: Array.from(allViewedAndFavIds) },
      OR: [
        // Match by tags
        ...(tags.length > 0 ? [{ tags: { hasSome: tags } }] : []),
        // Match by type
        ...(types.length > 0 ? [{ type: { in: types } }] : []),
        // Match by framework
        ...(frameworks.length > 0 ? [{ framework: { in: frameworks } }] : []),
      ],
    };

    // If OR is empty, just get popular commands
    if (where.OR.length === 0) {
      delete where.OR;
    }

    const recommendations = await prisma.command.findMany({
      where,
      orderBy: [
        { downloads: 'desc' },
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      select: { id: true, name: true, description: true, type: true, framework: true, tags: true, downloads: true, rating: true, ratingCount: true, favourites: true, author: { select: { username: true, avatar: true } } },
    });

    // Cache for 10 minutes
    await setCache(cacheKey, recommendations, 600);
    res.json(recommendations);
  } catch (error) {
    logError('Failed to get recommendations', error);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get similar commands based on a specific command
 * GET /api/recommendations/similar/:commandId?limit=10
 */
export async function getSimilarCommands(req, res) {
  try {
    const { commandId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || 10), 50);

    // Find the reference command
    const refCommand = await prisma.command.findUnique({
      where: { id: commandId },
      select: { id: true, tags: true, type: true, framework: true },
    });

    if (!refCommand) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // Try cache first
    const cacheKey = `similar-commands:${commandId}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Find similar commands
    const similar = await prisma.command.findMany({
      where: {
        approved: true,
        id: { not: commandId },
        OR: [
          ...(refCommand.tags && refCommand.tags.length > 0
            ? [{ tags: { hasSome: refCommand.tags } }]
            : []),
          refCommand.type ? { type: refCommand.type } : undefined,
          refCommand.framework ? { framework: refCommand.framework } : undefined,
        ].filter(Boolean),
      },
      orderBy: [
        { downloads: 'desc' },
        { rating: 'desc' },
      ],
      take: limit,
      select: { id: true, name: true, description: true, type: true, framework: true, tags: true, downloads: true, rating: true, ratingCount: true, favourites: true, author: { select: { username: true, avatar: true } } },
    });

    // Cache for 1 hour
    await setCache(cacheKey, similar, 3600);
    res.json(similar);
  } catch (error) {
    logError('Failed to get similar commands', error);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get user's browse history
 * GET /api/recommendations/history?limit=20
 */
export async function getBrowseHistory(req, res) {
  try {
    const user = requireAuthOrFail(req, res);
    const limit = Math.min(parseInt(req.query.limit || 20), 100);

    const history = await prisma.browseHistory.findMany({
      where: { userId: user.id },
      include: {
        command: {
          select: { id: true, name: true, description: true, type: true, framework: true, downloads: true, rating: true },
        },
      },
      orderBy: { viewedAt: 'desc' },
      take: limit,
    });

    res.json(history);
  } catch (error) {
    logError('Failed to get browse history', error);
    res.status(500).json({ error: 'Server error' });
  }
}
