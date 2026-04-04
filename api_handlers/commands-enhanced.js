/**
 * Enhanced commands handler with pagination, search, filtering, sorting, and analytics
 */

import prisma from './_lib/prisma.js';
import { requireAuthOrFail } from './_lib/utils.js';
import { getCache, setCache, deleteCache, invalidateCachePattern } from './_lib/cache.js';
import {
  validateCommandName,
  validateDescription,
  validateTags,
  validateFramework,
  validateType,
  validateUrl,
  validatePage,
  validateLimit,
  validateSearchQuery,
  validateSortField,
  validateSortOrder,
} from './_lib/validation.js';
import { logError, logInfo } from './_lib/logger.js';
import { trackView, trackDownload, recordRating } from './_lib/analytics.js';
import { rateLimiters } from './_lib/rateLimiter.js';

// Valid values (should match your constants)
const VALID_FRAMEWORKS = ['Express', 'Fastify', 'Hapi', 'Koa', 'NestJS', 'other'];
const VALID_TYPES = ['Middleware', 'Plugin', 'Command', 'Utility', 'Decorator', 'other'];
const VALID_SORT_FIELDS = ['downloads', 'rating', 'createdAt', 'updatedAt', 'views', 'favourites'];

/**
 * List commands with pagination, search, filtering, and sorting
 * Query params: page, limit, search, type, framework, tags, sortBy, sortOrder
 */
export async function listCommands(req, res) {
  try {
    // Validate query parameters
    const page = validatePage(req.query.page || 1);
    const limit = validateLimit(req.query.limit || 20, 100);
    const searchQuery = validateSearchQuery(req.query.search || '');
    const typeFilter = req.query.type ? validateType(req.query.type, VALID_TYPES) : null;
    const frameworkFilter = req.query.framework
      ? validateFramework(req.query.framework, VALID_FRAMEWORKS)
      : null;
    const tagsFilter = req.query.tags
      ? Array.isArray(req.query.tags)
        ? req.query.tags
        : [req.query.tags]
      : [];
    const sortBy = validateSortField(req.query.sortBy || 'downloads', VALID_SORT_FIELDS);
    const sortOrder = validateSortOrder(req.query.sortOrder || 'desc');

    if (!page.valid) return res.status(400).json({ error: page.error });
    if (!limit.valid) return res.status(400).json({ error: limit.error });
    if (typeFilter && !typeFilter.valid) return res.status(400).json({ error: typeFilter.error });
    if (frameworkFilter && !frameworkFilter.valid)
      return res.status(400).json({ error: frameworkFilter.error });
    if (!sortBy.valid) return res.status(400).json({ error: sortBy.error });
    if (!sortOrder.valid) return res.status(400).json({ error: sortOrder.error });

    // Build cache key
    const cacheKey = `commands:list:${page.value}:${limit.value}:${searchQuery.value}:${typeFilter?.value || ''}:${frameworkFilter?.value || ''}:${tagsFilter.join(',')}:${sortBy.value}:${sortOrder.value}`;

    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Build Prisma filter
    const where = {};
    if (searchQuery.value) {
      where.OR = [
        { name: { contains: searchQuery.value, mode: 'insensitive' } },
        { description: { contains: searchQuery.value, mode: 'insensitive' } },
        { tags: { hasSome: [searchQuery.value] } },
      ];
    }
    if (typeFilter?.value) {
      where.type = typeFilter.value;
    }
    if (frameworkFilter?.value) {
      where.framework = frameworkFilter.value;
    }
    if (tagsFilter.length > 0) {
      where.tags = { hasEvery: tagsFilter };
    }

    // Build sort
    const orderBy = {};
    orderBy[sortBy.value] = sortOrder.value;

    // Fetch commands
    const [totalCount, commands] = await Promise.all([
      prisma.command.count({ where }),
      prisma.command.findMany({
        where,
        include: { author: true },
        orderBy,
        skip: (page.value - 1) * limit.value,
        take: limit.value,
      }),
    ]);

    const result = {
      data: commands,
      pagination: {
        page: page.value,
        limit: limit.value,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit.value),
      },
    };

    // Cache for 5 minutes
    await setCache(cacheKey, result, 300);

    return res.json(result);
  } catch (error) {
    logError('Failed to list commands', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get a single command with analytics tracking
 */
export async function getCommand(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    const cacheKey = `command:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      // Track view in background (don't await)
      trackView(id).catch((err) => logError('Failed to track view', err));
      return res.json(cached);
    }

    const command = await prisma.command.findUnique({
      where: { id },
      include: {
        author: true,
        ratings: { select: { value: true } },
        favorites: { select: { userId: true } },
      },
    });

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // Format response
    const result = {
      ...command,
      ratings: undefined, // Don't expose individual ratings
      favorites: undefined,
    };

    // Cache for 10 minutes
    await setCache(cacheKey, result, 600);

    // Track view in background
    trackView(id).catch((err) => logError('Failed to track view', err));

    return res.json(result);
  } catch (error) {
    logError('Failed to get command', error, { commandId: req.params.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Create a new command (requires authentication)
 */
export async function createCommand(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const {
      name,
      description,
      type,
      framework,
      version,
      tags,
      githubUrl,
      websiteUrl,
      changelog,
      rawData,
    } = req.body || {};

    // Validate all inputs
    const nameValidation = validateCommandName(name);
    const descValidation = validateDescription(description);
    const typeValidation = validateType(type, VALID_TYPES);
    const fwValidation = validateFramework(framework, VALID_FRAMEWORKS);
    const tagsValidation = validateTags(tags || []);
    const ghValidation = validateUrl(githubUrl);
    const wsValidation = validateUrl(websiteUrl);

    if (!nameValidation.valid) return res.status(400).json({ error: nameValidation.error });
    if (!descValidation.valid) return res.status(400).json({ error: descValidation.error });
    if (!typeValidation.valid) return res.status(400).json({ error: typeValidation.error });
    if (!fwValidation.valid) return res.status(400).json({ error: fwValidation.error });
    if (!tagsValidation.valid) return res.status(400).json({ error: tagsValidation.error });
    if (!ghValidation.valid) return res.status(400).json({ error: ghValidation.error });
    if (!wsValidation.valid) return res.status(400).json({ error: wsValidation.error });

    // Create command
    const command = await prisma.command.create({
      data: {
        name: nameValidation.value,
        description: descValidation.value,
        type: typeValidation.value,
        framework: fwValidation.value,
        version: version || '1.0.0',
        tags: tagsValidation.value,
        githubUrl: ghValidation.value,
        websiteUrl: wsValidation.value,
        changelog: changelog || null,
        rawData: rawData || '{}',
        authorId: session.id,
      },
      include: { author: true },
    });

    // Invalidate list cache
    await invalidateCachePattern('commands:list:*');

    logInfo('Command created', { commandId: command.id, userId: session.id });

    return res.status(201).json(command);
  } catch (error) {
    logError('Failed to create command', error, { userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Update a command (requires authentication & ownership)
 */
export async function updateCommand(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    // Check ownership
    const command = await prisma.command.findUnique({ where: { id } });
    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }
    if (command.authorId !== session.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate inputs
    const updateData = {};
    if (req.body.name !== undefined) {
      const validation = validateCommandName(req.body.name);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
      updateData.name = validation.value;
    }
    if (req.body.description !== undefined) {
      const validation = validateDescription(req.body.description);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
      updateData.description = validation.value;
    }
    if (req.body.type !== undefined) {
      const validation = validateType(req.body.type, VALID_TYPES);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
      updateData.type = validation.value;
    }
    if (req.body.framework !== undefined) {
      const validation = validateFramework(req.body.framework, VALID_FRAMEWORKS);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
      updateData.framework = validation.value;
    }
    if (req.body.tags !== undefined) {
      const validation = validateTags(req.body.tags);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
      updateData.tags = validation.value;
    }
    if (req.body.githubUrl !== undefined) {
      const validation = validateUrl(req.body.githubUrl);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
      updateData.githubUrl = validation.value;
    }
    if (req.body.websiteUrl !== undefined) {
      const validation = validateUrl(req.body.websiteUrl);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
      updateData.websiteUrl = validation.value;
    }
    if (req.body.changelog !== undefined) {
      updateData.changelog = req.body.changelog;
    }
    if (req.body.rawData !== undefined) {
      updateData.rawData = req.body.rawData;
    }

    // Update command
    const updated = await prisma.command.update({
      where: { id },
      data: updateData,
      include: { author: true },
    });

    // Invalidate caches
    await deleteCache(`command:${id}`);
    await invalidateCachePattern('commands:list:*');

    logInfo('Command updated', { commandId: id, userId: session.id });

    return res.json(updated);
  } catch (error) {
    logError('Failed to update command', error, { commandId: req.params.id, userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Delete a command (requires authentication & ownership)
 */
export async function deleteCommand(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    // Check ownership
    const command = await prisma.command.findUnique({ where: { id } });
    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }
    if (command.authorId !== session.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete command
    await prisma.command.delete({ where: { id } });

    // Invalidate caches
    await deleteCache(`command:${id}`);
    await invalidateCachePattern('commands:list:*');

    logInfo('Command deleted', { commandId: id, userId: session.id });

    return res.json({ success: true });
  } catch (error) {
    logError('Failed to delete command', error, { commandId: req.params.id, userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Rate a command
 */
export async function rateCommand(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { id } = req.params;
    const { value } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    const ratingValidation = validateRating(value);
    if (!ratingValidation.valid) {
      return res.status(400).json({ error: ratingValidation.error });
    }

    // Record rating
    const stats = await recordRating(id, session.id, ratingValidation.value);

    // Invalidate cache
    await deleteCache(`command:${id}`);
    await invalidateCachePattern('commands:list:*');

    logInfo('Command rated', { commandId: id, userId: session.id, rating: ratingValidation.value });

    return res.json({ success: true, ...stats });
  } catch (error) {
    logError('Failed to rate command', error, { commandId: req.params.id, userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Download a command (track download)
 */
export async function downloadCommand(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    const command = await prisma.command.findUnique({ where: { id } });
    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // Track download and increment counter
    await trackDownload(id);
    await prisma.command.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });

    // Invalidate cache
    await deleteCache(`command:${id}`);
    await invalidateCachePattern('commands:list:*');

    return res.json(command);
  } catch (error) {
    logError('Failed to download command', error, { commandId: req.params.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

// Export all handlers
export default {
  listCommands,
  getCommand,
  createCommand,
  updateCommand,
  deleteCommand,
  rateCommand,
  downloadCommand,
};
