/**
 * Trending commands computation and retrieval
 */

import prisma from './_lib/prisma.js';
import { getCache, setCache } from './_lib/cache.js';
import { logError, logInfo } from './_lib/logger.js';

/**
 * Compute trending commands based on recent downloads and activity
 * Updates the TrendingCommand table
 */
export async function computeTrendingCommands() {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Compute weekly trending (weighted by recency)
    const weeklyCommands = await prisma.command.findMany({
      where: {
        updatedAt: { gte: oneWeekAgo },
        downloads: { gt: 0 },
      },
      select: { id: true, downloads: true, views: true, rating: true, updatedAt: true },
    });

    // Score calculation: downloads (0.5) + views (0.3) + rating (0.2)
    const weeklyScores = weeklyCommands
      .map((cmd) => ({
        id: cmd.id,
        score: cmd.downloads * 0.5 + cmd.views * 0.3 + cmd.rating * 0.2,
      }))
      .sort((a, b) => b.score - a.score);

    // Store weekly trending
    for (let i = 0; i < weeklyScores.length; i++) {
      await prisma.trendingCommand.upsert({
        where: {
          commandId_timeWindow: { commandId: weeklyScores[i].id, timeWindow: 'weekly' },
        },
        update: {
          rank: i + 1,
          score: weeklyScores[i].score,
          computedAt: new Date(),
        },
        create: {
          commandId: weeklyScores[i].id,
          rank: i + 1,
          timeWindow: 'weekly',
          score: weeklyScores[i].score,
        },
      });
    }

    // Compute monthly trending
    const monthlyCommands = await prisma.command.findMany({
      where: {
        updatedAt: { gte: oneMonthAgo },
        downloads: { gt: 0 },
      },
      select: { id: true, downloads: true, views: true, rating: true, updatedAt: true },
    });

    const monthlyScores = monthlyCommands
      .map((cmd) => ({
        id: cmd.id,
        score: cmd.downloads * 0.5 + cmd.views * 0.3 + cmd.rating * 0.2,
      }))
      .sort((a, b) => b.score - a.score);

    // Store monthly trending
    for (let i = 0; i < monthlyScores.length; i++) {
      await prisma.trendingCommand.upsert({
        where: {
          commandId_timeWindow: { commandId: monthlyScores[i].id, timeWindow: 'monthly' },
        },
        update: {
          rank: i + 1,
          score: monthlyScores[i].score,
          computedAt: new Date(),
        },
        create: {
          commandId: monthlyScores[i].id,
          rank: i + 1,
          timeWindow: 'monthly',
          score: monthlyScores[i].score,
        },
      });
    }

    logInfo('Trending commands computed', {
      weeklyCount: weeklyScores.length,
      monthlyCount: monthlyScores.length,
    });
  } catch (error) {
    logError('Failed to compute trending commands', error);
  }
}

/**
 * Get trending commands for a time window
 */
export async function getTrendingCommands(req, res) {
  try {
    const { timeWindow = 'weekly', limit = 10 } = req.query;

    if (!['weekly', 'monthly'].includes(timeWindow)) {
      return res.status(400).json({ error: 'Invalid time window. Must be "weekly" or "monthly"' });
    }

    const cacheKey = `trending:${timeWindow}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const trending = await prisma.trendingCommand.findMany({
      where: { timeWindow },
      include: {
        command: { include: { author: true } },
      },
      orderBy: { rank: 'asc' },
      take: parseInt(limit, 10),
    });

    const result = trending.map((t) => ({
      ...t.command,
      rank: t.rank,
      trendingScore: t.score,
    }));

    // Cache for 1 hour
    await setCache(cacheKey, result, 3600);

    return res.json(result);
  } catch (error) {
    logError('Failed to get trending commands', error);
    return res.status(500).json({ error: 'Failed to get trending commands' });
  }
}

/**
 * Schedule trending computation (call from server.js)
 */
export function scheduleTrendingComputation(intervalMs = 6 * 60 * 60 * 1000) {
  // Compute trending every 6 hours by default
  setInterval(computeTrendingCommands, intervalMs);
  // Run once on startup
  computeTrendingCommands();
}

export default {
  getTrendingCommands,
  computeTrendingCommands,
  scheduleTrendingComputation,
};
