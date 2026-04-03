/**
 * Rate limiting middleware using Redis (with in-memory fallback)
 */

import { redis } from './cache.js';
import { logWarn } from './logger.js';

// In-memory rate limit store (fallback when Redis is unavailable)
const inMemoryStore = new Map();

/**
 * Create a rate limiter middleware
 * @param {Object} options - Configuration
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Max requests per window
 * @param {Function} options.keyGenerator - Function to generate rate limit key
 * @param {Function} options.onLimitExceeded - Callback when limit exceeded
 */
export function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute default
    maxRequests = 100,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    onLimitExceeded = null,
  } = options;

  return async (req, res, next) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        return next();
      }

      const key = `rate-limit:${keyGenerator(req)}`;
      let current;

      if (redis) {
        // Use Redis for rate limiting
        current = await redis.incr(key);

        // Set expiry on first request
        if (current === 1) {
          await redis.pexpire(key, windowMs);
        }
      } else {
        // Use in-memory fallback
        const now = Date.now();
        const entry = inMemoryStore.get(key);

        if (!entry || now > entry.resetTime) {
          // New window
          inMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
          current = 1;
        } else {
          // Existing window
          entry.count++;
          current = entry.count;
        }

        // Cleanup old entries periodically
        if (inMemoryStore.size > 10000) {
          for (const [k, v] of inMemoryStore.entries()) {
            if (now > v.resetTime) {
              inMemoryStore.delete(k);
            }
          }
        }
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      if (current > maxRequests) {
        logWarn('Rate limit exceeded', {
          key,
          current,
          maxRequests,
          ip: keyGenerator(req),
        });

        if (onLimitExceeded) {
          return onLimitExceeded(req, res);
        }

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      next();
    } catch (error) {
      logWarn('Rate limiter error', { error: error.message });
      // Don't block requests if rate limiter fails
      next();
    }
  };
}

/**
 * Helper to create API-specific rate limiters
 */
export const rateLimiters = {
  // General API calls
  api: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  }),

  // Upload/creation endpoints (stricter)
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  }),

  // Authentication endpoints (stricter)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  }),

  // Search/read endpoints (more lenient)
  read: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300,
  }),

  // Rating endpoints
  rating: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  }),
};
