import Redis from 'ioredis';

// Initialize Redis only if REDIS_URL or REDIS_HOST is explicitly configured
const isRedisConfigured = process.env.REDIS_URL || process.env.REDIS_HOST;

let redis = null;

if (isRedisConfigured) {
  redis = new Redis(
    process.env.REDIS_URL || {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableOfflineQueue: false,
    },
  );

  redis.on('error', (err) => {
    console.warn('[cache] Redis error (falling back to in-memory):', err.message);
  });

  redis.on('connect', () => {
    console.log('[cache] Redis connected');
  });
} else {
  console.log('[cache] Redis not configured, using in-memory storage');
}

/**
 * Get value from cache
 */
export async function getCache(key) {
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.warn(`[cache] GET error for key ${key}:`, err.message);
    return null;
  }
}

/**
 * Set value in cache with optional TTL (seconds)
 */
export async function setCache(key, value, ttl = 300) {
  if (!redis) return;
  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (err) {
    console.warn(`[cache] SET error for key ${key}:`, err.message);
  }
}

/**
 * Delete cache key(s)
 */
export async function deleteCache(...keys) {
  if (!redis) return;
  try {
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn(`[cache] DEL error:`, err.message);
  }
}

/**
 * Invalidate all cache keys matching a pattern
 */
export async function invalidateCachePattern(pattern) {
  if (!redis) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      if (Array.isArray(keys) && keys.length > 0) {
        await redis.del(...keys);
      }
      cursor = nextCursor;
    } while (cursor !== '0');
  } catch (err) {
    console.warn(`[cache] INVALIDATE pattern error for ${pattern}:`, err.message);
  }
}

/**
 * Wrap a function with caching
 */
export async function cached(key, fn, ttl = 300) {
  // Try to get from cache first
  const cached = await getCache(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss, execute function
  const result = await fn();

  // Store in cache
  await setCache(key, result, ttl);

  return result;
}

export { redis };
