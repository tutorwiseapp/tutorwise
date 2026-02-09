/**
 * Filename: apps/web/src/middleware/rateLimiting.ts
 * Purpose: Redis-based rate limiting for network features (SDD v4.5)
 * Created: 2025-11-07
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  message?: string;
}

// Rate limit configurations
const LIMITS: Record<string, RateLimitConfig> = {
  'network:request': {
    requests: 100,
    window: 86400, // 24 hours
    message: 'Connection request limit exceeded. Try again tomorrow.'
  },
  'network:invite': {
    requests: 50,
    window: 86400, // 24 hours
    message: 'Invitation limit exceeded. Try again tomorrow.'
  },
  'network:remove': {
    requests: 20,
    window: 3600, // 1 hour
    message: 'Connection removal limit exceeded. Try again in an hour.'
  },
  'student:invite': {
    requests: 50,
    window: 86400, // 24 hours
    message: 'Student invitation limit exceeded. Try again tomorrow.'
  },
  'payment:booking_create': {
    requests: 20,
    window: 3600, // 1 hour
    message: 'Booking creation limit exceeded. Try again in an hour.'
  },
  'payment:checkout_create': {
    requests: 30,
    window: 3600, // 1 hour
    message: 'Checkout creation limit exceeded. Try again in an hour.'
  },
  'payment:refund': {
    requests: 10,
    window: 3600, // 1 hour
    message: 'Refund request limit exceeded. Try again in an hour.'
  },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  message?: string;
}

/**
 * Check if a user action is within rate limits
 * @param userId - User's profile ID
 * @param action - Action type (network:request, network:invite, network:remove)
 * @returns Rate limit result with allowed status, remaining count, and reset time
 */
export async function checkRateLimit(
  userId: string,
  action: keyof typeof LIMITS
): Promise<RateLimitResult> {
  const config = LIMITS[action];
  if (!config) {
    throw new Error(`Unknown rate limit action: ${action}`);
  }

  const key = `rate_limit:${action}:${userId}`;

  try {
    // Increment counter
    const count = await redis.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await redis.expire(key, config.window);
    }

    // Get time-to-live
    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + (ttl * 1000);
    const remaining = Math.max(0, config.requests - count);

    return {
      allowed: count <= config.requests,
      remaining,
      resetAt,
      message: count > config.requests ? config.message : undefined,
    };
  } catch (error) {
    console.error('[rateLimiting] Redis error:', error);
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: config.requests,
      resetAt: Date.now() + (config.window * 1000),
    };
  }
}

/**
 * Generate rate limit response headers
 * @param remaining - Remaining requests allowed
 * @param resetAt - Unix timestamp when limit resets
 * @returns Headers object for NextResponse
 */
export function rateLimitHeaders(remaining: number, resetAt: number) {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetAt).toISOString(),
  };
}

/**
 * Format rate limit error response
 * @param result - Rate limit result
 * @returns Error response object
 */
export function rateLimitError(result: RateLimitResult) {
  const resetDate = new Date(result.resetAt);
  const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000 / 60); // minutes

  return {
    error: result.message || 'Rate limit exceeded',
    details: {
      remaining: result.remaining,
      resetAt: resetDate.toISOString(),
      resetIn: `${resetIn} minute${resetIn === 1 ? '' : 's'}`,
    },
  };
}
