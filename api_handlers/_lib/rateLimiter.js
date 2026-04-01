/**
 * Rate limiting middleware using Redis
 */

import { redis } from './cache.js';
import { logWarn } from './logger.js';

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
      const key = `rate-limit:${keyGenerator(req)}`;
      const current = await redis.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await redis.pexpire(key, windowMs);
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
