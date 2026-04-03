/**
 * Trending commands computation and retrieval
 */

import prisma from './_lib/prisma.js';
import { getCache, setCache } from './_lib/cache.js';
import { logError, logInfo } from './_lib/logger.js';

/**
 * Compute trending commands based on recent downloads and activity
 * Updates the TrendingCommand table for daily, weekly, and monthly timeframes
 */
export async function computeTrendingCommands() {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Helper function to compute and store trending
    const computeAndStore = async (timeWindow, dateFilter) => {
      const commands = await prisma.command.findMany({
        where: {
          updatedAt: { gte: dateFilter },
          downloads: { gt: 0 },
        },
        select: { id: true, downloads: true, views: true, rating: true, updatedAt: true },
      });

      // Score calculation: downloads (0.5) + views (0.3) + rating (0.2)
      const scores = commands
        .map((cmd) => ({
          id: cmd.id,
          score: cmd.downloads * 0.5 + cmd.views * 0.3 + cmd.rating * 0.2,
        }))
        .sort((a, b) => b.score - a.score);

      // Store trending
      for (let i = 0; i < scores.length; i++) {
        await prisma.trendingCommand.upsert({
          where: {
            commandId_timeWindow: { commandId: scores[i].id, timeWindow },
          },
          update: {
            rank: i + 1,
            score: scores[i].score,
            computedAt: new Date(),
          },
          create: {
            commandId: scores[i].id,
            rank: i + 1,
            timeWindow,
            score: scores[i].score,
          },
        });
      }

      return scores.length;
    };

    // Compute all three timeframes
    const dailyCount = await computeAndStore('daily', oneDayAgo);
    const weeklyCount = await computeAndStore('weekly', oneWeekAgo);
    const monthlyCount = await computeAndStore('monthly', oneMonthAgo);

    logInfo('Trending commands computed', {
      dailyCount,
      weeklyCount,
      monthlyCount,
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

    if (!['daily', 'weekly', 'monthly'].includes(timeWindow)) {
      return res.status(400).json({ error: 'Invalid time window. Must be "daily", "weekly", or "monthly"' });
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
