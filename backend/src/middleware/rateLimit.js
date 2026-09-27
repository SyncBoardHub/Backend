'use strict';

const expressRateLimit = require('express-rate-limit');
const { isRedisAvailable, getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Creates a rate limiter.
 * When Redis is available, uses a distributed store so limits are enforced
 * consistently across all backend instances.
 * Falls back to in-memory store when Redis is unavailable (single-instance safe).
 */
function rateLimit(windowMs = 60_000, maxAttempts = 10) {
  const handler = (req, res) => {
    const retryAfter = Math.ceil((res.getHeader('Retry-After') || windowMs / 1000));
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.'
      },
      retryAfter,
      requestId: res.locals.requestId
    });
  };

  // Attempt to use Redis store for distributed rate limiting
  let store;
  try {
    if (isRedisAvailable()) {
      // Lazy-require to avoid crashing when rate-limit-redis not installed
      const { RedisStore } = require('rate-limit-redis');
      store = new RedisStore({
        sendCommand: async (...args) => {
          const client = await getRedisClient();
          if (!client) throw new Error('Redis unavailable');
          return client.sendCommand(args);
        }
      });
      logger.debug('Rate limiter using Redis distributed store');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis rate limit store unavailable, using memory store');
  }

  return expressRateLimit({
    windowMs,
    limit: maxAttempts,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
    ...(store ? { store } : {})
  });
}

module.exports = rateLimit;
