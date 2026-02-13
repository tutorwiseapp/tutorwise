/**
 * Lexi Rate Limiter
 *
 * Redis-based rate limiting for Lexi conversations.
 * Uses the existing Redis client from apps/web/src/lib/redis.ts
 *
 * Rate limits are enforced per-user and per-organisation to prevent abuse.
 *
 * @module lexi/services/rate-limiter
 */

import { redis } from '../../apps/web/src/lib/redis';

// --- Constants ---

const RATE_LIMIT_KEY_PREFIX = 'lexi:rate:';

// --- Types ---

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  message: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // seconds
  message?: string;
}

export type RateLimitAction =
  | 'message'           // Sending a message
  | 'session:start'     // Starting a new session
  | 'session:refresh'   // Refreshing a session
  | 'action:booking'    // Booking-related actions
  | 'action:payment'    // Payment-related actions
  | 'search';           // Search operations

// --- Rate Limit Configurations ---

const RATE_LIMITS: Record<RateLimitAction, RateLimitConfig> = {
  'message': {
    requests: 60,
    window: 60, // 60 messages per minute
    message: 'Too many messages. Please slow down and try again in a moment.',
  },
  'session:start': {
    requests: 10,
    window: 3600, // 10 new sessions per hour
    message: 'Session limit reached. Please try again later.',
  },
  'session:refresh': {
    requests: 120,
    window: 60, // 120 refreshes per minute (heartbeat)
    message: 'Too many session refreshes.',
  },
  'action:booking': {
    requests: 20,
    window: 3600, // 20 booking actions per hour
    message: 'Booking action limit reached. Please try again in an hour.',
  },
  'action:payment': {
    requests: 10,
    window: 3600, // 10 payment actions per hour
    message: 'Payment action limit reached. Please try again in an hour.',
  },
  'search': {
    requests: 30,
    window: 60, // 30 searches per minute
    message: 'Search limit reached. Please wait before searching again.',
  },
};

// Organisation-level multipliers (orgs get higher limits)
const ORG_LIMIT_MULTIPLIER = 10;

// --- Rate Limiter Class ---

export class LexiRateLimiter {
  /**
   * Check if an action is allowed for a user
   */
  async checkLimit(
    userId: string,
    action: RateLimitAction,
    organisationId?: string
  ): Promise<RateLimitResult> {
    const config = RATE_LIMITS[action];
    if (!config) {
      console.warn(`[LexiRateLimiter] Unknown action: ${action}`);
      return { allowed: true, remaining: 999, resetAt: Date.now() };
    }

    // Check user limit first
    const userResult = await this.checkUserLimit(userId, action, config);
    if (!userResult.allowed) {
      return userResult;
    }

    // If user belongs to an org, also check org limit
    if (organisationId) {
      const orgResult = await this.checkOrgLimit(organisationId, action, config);
      if (!orgResult.allowed) {
        return orgResult;
      }
    }

    return userResult;
  }

  /**
   * Check rate limit for a user
   */
  private async checkUserLimit(
    userId: string,
    action: RateLimitAction,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${RATE_LIMIT_KEY_PREFIX}user:${action}:${userId}`;
    return this.checkKey(key, config);
  }

  /**
   * Check rate limit for an organisation
   */
  private async checkOrgLimit(
    organisationId: string,
    action: RateLimitAction,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${RATE_LIMIT_KEY_PREFIX}org:${action}:${organisationId}`;
    // Orgs get higher limits
    const orgConfig = {
      ...config,
      requests: config.requests * ORG_LIMIT_MULTIPLIER,
    };
    return this.checkKey(key, orgConfig);
  }

  /**
   * Core rate limit check using Redis
   */
  private async checkKey(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    if (!redis) {
      // Fail open if Redis is not configured
      console.warn('[LexiRateLimiter] Redis not configured, allowing request');
      return {
        allowed: true,
        remaining: config.requests,
        resetAt: Date.now() + (config.window * 1000),
      };
    }

    try {
      // Increment counter
      const count = await redis.incr(key);

      // Set expiry on first request
      if (count === 1) {
        await redis.expire(key, config.window);
      }

      // Get TTL for reset time
      const ttl = await redis.ttl(key);
      const resetAt = Date.now() + (ttl * 1000);
      const remaining = Math.max(0, config.requests - count);
      const allowed = count <= config.requests;

      return {
        allowed,
        remaining,
        resetAt,
        retryAfter: allowed ? undefined : ttl,
        message: allowed ? undefined : config.message,
      };
    } catch (error) {
      console.error('[LexiRateLimiter] Redis error:', error);
      // Fail open on error
      return {
        allowed: true,
        remaining: config.requests,
        resetAt: Date.now() + (config.window * 1000),
      };
    }
  }

  /**
   * Reset rate limit for a user (admin action)
   */
  async resetLimit(userId: string, action: RateLimitAction): Promise<boolean> {
    if (!redis) return false;

    try {
      const key = `${RATE_LIMIT_KEY_PREFIX}user:${action}:${userId}`;
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('[LexiRateLimiter] Failed to reset limit:', error);
      return false;
    }
  }

  /**
   * Get current usage for a user
   */
  async getUsage(userId: string, action: RateLimitAction): Promise<{
    used: number;
    limit: number;
    resetAt: number;
  } | null> {
    if (!redis) return null;

    const config = RATE_LIMITS[action];
    if (!config) return null;

    try {
      const key = `${RATE_LIMIT_KEY_PREFIX}user:${action}:${userId}`;
      const count = await redis.get(key);
      const ttl = await redis.ttl(key);

      return {
        used: count ? parseInt(count, 10) : 0,
        limit: config.requests,
        resetAt: ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + (config.window * 1000),
      };
    } catch (error) {
      console.error('[LexiRateLimiter] Failed to get usage:', error);
      return null;
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return redis !== null;
  }
}

// --- Helper Functions ---

/**
 * Generate rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Format rate limit error for API response
 */
export function rateLimitError(result: RateLimitResult): {
  error: string;
  code: string;
  retryAfter?: number;
  resetAt: string;
} {
  return {
    error: result.message || 'Rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: result.retryAfter,
    resetAt: new Date(result.resetAt).toISOString(),
  };
}

// --- Export Singleton ---

export const rateLimiter = new LexiRateLimiter();

export default LexiRateLimiter;
