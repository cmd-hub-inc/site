/**
 * Saved Searches handler
 * Allows users to save, retrieve, update, and delete their search queries
 */

import prisma from './_lib/prisma.js';
import { requireAuthOrFail } from './_lib/utils.js';
import { getCache, setCache, deleteCache } from './_lib/cache.js';
import { logError, logInfo } from './_lib/logger.js';

/**
 * List user's saved searches
 * GET /api/saved-searches
 */
export async function listSavedSearches(req, res) {
  try {
    const user = requireAuthOrFail(req, res);
    if (!user) return;

    // Try cache first
    const cacheKey = `saved-searches:${user.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { lastUsed: 'desc' },
    });

    // Cache for 5 minutes
    await setCache(cacheKey, savedSearches, 300);
    res.json(savedSearches);
  } catch (error) {
    logError('Failed to list saved searches', error);
    res.status(500).json({ error: 'Failed to list saved searches' });
  }
}

/**
 * Create a new saved search
 * POST /api/saved-searches
 * Body: { name, query, filters? }
 */
export async function createSavedSearch(req, res) {
  try {
    const user = requireAuthOrFail(req, res);
    if (!user) return;

    const { name, query, filters } = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Valid search name is required' });
    }
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Valid search query is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Search name must be less than 100 characters' });
    }

    // Check for duplicate name
    const existing = await prisma.savedSearch.findUnique({
      where: { userId_name: { userId: user.id, name: name.trim() } },
    });
    if (existing) {
      return res.status(409).json({ error: 'A saved search with this name already exists' });
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        name: name.trim(),
        query: query.trim(),
        filters: filters ? JSON.stringify(filters) : null,
      },
    });

    // Invalidate cache
    await deleteCache(`saved-searches:${user.id}`);

    logInfo('Created saved search', { userId: user.id, searchId: savedSearch.id });
    res.status(201).json(savedSearch);
  } catch (error) {
    logError('Failed to create saved search', error);
    res.status(500).json({ error: 'Failed to create saved search' });
  }
}

/**
 * Update a saved search
 * PATCH /api/saved-searches/:id
 * Body: { name?, query?, filters? }
 */
export async function updateSavedSearch(req, res) {
  try {
    const user = requireAuthOrFail(req, res);
    if (!user) return;

    const { id } = req.params;
    const { name, query, filters } = req.body;

    // Verify ownership
    const savedSearch = await prisma.savedSearch.findUnique({ where: { id } });
    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }
    if (savedSearch.userId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updateData = { lastUsed: new Date() };
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Valid search name is required' });
      }
      updateData.name = name.trim();
    }
    if (query !== undefined) {
      if (typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ error: 'Valid search query is required' });
      }
      updateData.query = query.trim();
    }
    if (filters !== undefined) {
      updateData.filters = filters ? JSON.stringify(filters) : null;
    }

    const updated = await prisma.savedSearch.update({
      where: { id },
      data: updateData,
    });

    // Invalidate cache
    await deleteCache(`saved-searches:${user.id}`);

    logInfo('Updated saved search', { userId: user.id, searchId: id });
    res.json(updated);
  } catch (error) {
    logError('Failed to update saved search', error);
    res.status(500).json({ error: 'Failed to update saved search' });
  }
}

/**
 * Delete a saved search
 * DELETE /api/saved-searches/:id
 */
export async function deleteSavedSearch(req, res) {
  try {
    const user = requireAuthOrFail(req, res);
    if (!user) return;

    const { id } = req.params;

    // Verify ownership
    const savedSearch = await prisma.savedSearch.findUnique({ where: { id } });
    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }
    if (savedSearch.userId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.savedSearch.delete({ where: { id } });

    // Invalidate cache
    await deleteCache(`saved-searches:${user.id}`);

    logInfo('Deleted saved search', { userId: user.id, searchId: id });
    res.status(204).send();
  } catch (error) {
    logError('Failed to delete saved search', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
}

/**
 * Get a specific saved search
 * GET /api/saved-searches/:id
 */
export async function getSavedSearch(req, res) {
  try {
    const user = requireAuthOrFail(req, res);
    if (!user) return;

    const { id } = req.params;

    const savedSearch = await prisma.savedSearch.findUnique({ where: { id } });
    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }
    if (savedSearch.userId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update lastUsed timestamp
    await prisma.savedSearch.update({
      where: { id },
      data: { lastUsed: new Date() },
    });

    res.json(savedSearch);
  } catch (error) {
    logError('Failed to get saved search', error);
    res.status(500).json({ error: 'Failed to get saved search' });
  }
}
