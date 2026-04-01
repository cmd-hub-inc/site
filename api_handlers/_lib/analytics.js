/**
 * Analytics tracking for commands
 */

import prisma from './prisma.js';
import { redis } from './cache.js';
import { logError } from './logger.js';

/**
 * Track a view event (increments in-memory counter)
 */
export async function trackView(commandId) {
  try {
    const key = `analytics:views:${commandId}`;
    await redis.incr(key);
    // Set expiry if new key
    const ttl = await redis.ttl(key);
    if (ttl === -1) {
      await redis.expire(key, 3600); // 1 hour
    }
  } catch (error) {
    logError('Failed to track view', error, { commandId });
  }
}

/**
 * Track a download event
 */
export async function trackDownload(commandId) {
  try {
    const key = `analytics:downloads:${commandId}`;
    await redis.incr(key);
    const ttl = await redis.ttl(key);
    if (ttl === -1) {
      await redis.expire(key, 3600);
    }
  } catch (error) {
    logError('Failed to track download', error, { commandId });
  }
}

/**
 * Track a favorite event
 */
export async function trackFavorite(commandId) {
  try {
    const key = `analytics:favorites:${commandId}`;
    await redis.incr(key);
    const ttl = await redis.ttl(key);
    if (ttl === -1) {
      await redis.expire(key, 3600);
    }
  } catch (error) {
    logError('Failed to track favorite', error, { commandId });
  }
}

/**
 * Get buffered analytics for a command
 */
export async function getBufferedAnalytics(commandId) {
  try {
    const views = (await redis.get(`analytics:views:${commandId}`)) || '0';
    const downloads = (await redis.get(`analytics:downloads:${commandId}`)) || '0';
    const favorites = (await redis.get(`analytics:favorites:${commandId}`)) || '0';

    return {
      views: parseInt(views, 10),
      downloads: parseInt(downloads, 10),
      favorites: parseInt(favorites, 10),
    };
  } catch (error) {
    logError('Failed to get buffered analytics', error, { commandId });
    return { views: 0, downloads: 0, favorites: 0 };
  }
}

/**
 * Flush buffered analytics to database (call periodically via cron job)
 */
export async function flushAnalyticsToDB() {
  try {
    // Get all analytics keys
    const keys = await redis.keys('analytics:*');

    for (const key of keys) {
      const [type, metric, commandId] = key.split(':');
      const value = parseInt(await redis.get(key), 10) || 0;

      if (value === 0) continue;

      // Update command's counters based on metric type
      if (metric === 'views') {
        await prisma.command.update({
          where: { id: commandId },
          data: { views: { increment: value } },
        });
      } else if (metric === 'downloads') {
        await prisma.command.update({
          where: { id: commandId },
          data: { downloads: { increment: value } },
        });
      }

      // Delete key after flushing
      await redis.del(key);
    }
  } catch (error) {
    logError('Failed to flush analytics to DB', error);
  }
}

/**
 * Record a rating event and update analytics
 */
export async function recordRating(commandId, userId, value) {
  try {
    // Store rating
    await prisma.rating.upsert({
      where: {
        userId_commandId: { userId, commandId },
      },
      update: { value },
      create: { userId, commandId, value },
    });

    // Recalculate rating stats
    const ratings = await prisma.rating.findMany({
      where: { commandId },
      select: { value: true },
    });

    const avgRating =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length : 0;

    await prisma.command.update({
      where: { id: commandId },
      data: {
        rating: avgRating,
        ratingCount: ratings.length,
      },
    });

    return { avgRating, ratingCount: ratings.length };
  } catch (error) {
    logError('Failed to record rating', error, { commandId, userId, value });
    throw error;
  }
}

/**
 * Schedule periodic analytics flushing (call from server.js)
 */
export function scheduleAnalyticsFlush(intervalMs = 5 * 60 * 1000) {
  // Flush every 5 minutes by default
  setInterval(flushAnalyticsToDB, intervalMs);
}
