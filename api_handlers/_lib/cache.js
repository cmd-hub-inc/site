import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

/**
 * Get value from cache
 */
export async function getCache(key) {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error(`Cache GET error for key ${key}:`, err);
    return null;
  }
}

/**
 * Set value in cache with optional TTL (seconds)
 */
export async function setCache(key, value, ttl = 300) {
  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (err) {
    console.error(`Cache SET error for key ${key}:`, err);
  }
}

/**
 * Delete cache key(s)
 */
export async function deleteCache(...keys) {
  try {
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error(`Cache DEL error:`, err);
  }
}

/**
 * Invalidate all cache keys matching a pattern
 */
export async function invalidateCachePattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error(`Cache INVALIDATE pattern error for ${pattern}:`, err);
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
