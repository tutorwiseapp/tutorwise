/**
 * AI Agent Rate Limiter
 *
 * Implements cost-control rate limiting for Lexi (support) and Sage (tutor):
 * - Free tier: 10 questions/day (rolling 24h window)
 * - Sage Pro tier: 5,000 questions/month (calendar month reset)
 * - Lexi: No premium tier (always 10/day)
 *
 * Uses Redis for fast, distributed rate limiting with automatic expiry.
 *
 * @module lib/ai-agents/rate-limiter
 */

import { redis } from '@/lib/redis';

// --- Constants ---

const FREE_DAILY_LIMIT = 10;
const SAGE_PRO_MONTHLY_LIMIT = 5000;
const SAGE_PRO_HOURLY_BURST_LIMIT = 100; // Prevent abuse/account sharing

const ROLLING_WINDOW_HOURS = 24;
const ROLLING_WINDOW_MS = ROLLING_WINDOW_HOURS * 60 * 60 * 1000;

// --- Types ---

export type AIAgent = 'lexi' | 'sage';
export type RateLimitTier = 'free' | 'sage_pro';

export interface RateLimitResult {
  allowed: boolean;
  tier: RateLimitTier;
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
  error?: 'daily_limit' | 'monthly_limit' | 'hourly_burst_limit';
  message?: string;
  upsell?: {
    plan: 'sage_pro';
    price: string;
    questions: number;
  };
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan?: 'sage_pro';
  expiresAt?: Date;
}

// --- Main Rate Limit Check ---

/**
 * Check if user can send a message to an AI agent.
 * Enforces different limits based on agent and subscription tier.
 */
export async function checkAIAgentRateLimit(
  agent: AIAgent,
  userId: string,
  subscription?: SubscriptionStatus
): Promise<RateLimitResult> {
  if (!redis) {
    // Redis not available - allow request but log warning
    console.warn('[RateLimiter] Redis not available, allowing request');
    return {
      allowed: true,
      tier: 'free',
      limit: FREE_DAILY_LIMIT,
      used: 0,
      remaining: FREE_DAILY_LIMIT,
      resetAt: getNextMidnightUTC(),
    };
  }

  // Lexi: Always free tier (10/day), no premium option
  if (agent === 'lexi') {
    return checkFreeTierLimit(userId, agent);
  }

  // Sage: Check subscription status
  const hasSagePro = subscription?.isActive && subscription?.plan === 'sage_pro';

  if (hasSagePro) {
    return checkSageProLimit(userId);
  } else {
    return checkFreeTierLimit(userId, agent);
  }
}

/**
 * Increment usage counter after successful message.
 * Call this AFTER the AI response is generated.
 */
export async function incrementAIAgentUsage(
  agent: AIAgent,
  userId: string,
  subscription?: SubscriptionStatus
): Promise<void> {
  if (!redis) {
    console.warn('[RateLimiter] Redis not available, skipping increment');
    return;
  }

  const hasSagePro =
    agent === 'sage' && subscription?.isActive && subscription?.plan === 'sage_pro';

  if (hasSagePro) {
    await incrementSageProUsage(userId);
  } else {
    await incrementFreeTierUsage(userId, agent);
  }
}

// --- Free Tier: Rolling 24-Hour Window ---

/**
 * Check free tier limit (10 questions/day, rolling 24h window).
 * Uses Redis Sorted Set with timestamps to prevent gaming.
 */
async function checkFreeTierLimit(userId: string, agent: AIAgent): Promise<RateLimitResult> {
  const key = `${agent}:messages:free:${userId}`;
  const now = Date.now();
  const windowStart = now - ROLLING_WINDOW_MS;

  // Remove expired messages (older than 24h)
  await redis!.zremrangebyscore(key, 0, windowStart);

  // Count messages in current 24h window
  const count = await redis!.zcount(key, windowStart, now);

  if (count >= FREE_DAILY_LIMIT) {
    // Find when the oldest message expires (becomes available again)
    const oldestMessages = await redis!.zrange(key, 0, 0, 'WITHSCORES');
    const oldestTimestamp = oldestMessages.length > 0 ? parseInt(oldestMessages[1]) : now;
    const resetAt = new Date(oldestTimestamp + ROLLING_WINDOW_MS);

    return {
      allowed: false,
      tier: 'free',
      limit: FREE_DAILY_LIMIT,
      used: FREE_DAILY_LIMIT,
      remaining: 0,
      resetAt,
      error: 'daily_limit',
      message: 'Daily question limit reached',
      upsell:
        agent === 'sage'
          ? {
              plan: 'sage_pro',
              price: '£10/month',
              questions: SAGE_PRO_MONTHLY_LIMIT,
            }
          : undefined,
    };
  }

  const resetAt = await getNext24hReset(userId, agent);

  return {
    allowed: true,
    tier: 'free',
    limit: FREE_DAILY_LIMIT,
    used: count,
    remaining: FREE_DAILY_LIMIT - count,
    resetAt,
  };
}

/**
 * Increment free tier usage counter.
 * Adds current timestamp to sorted set.
 */
async function incrementFreeTierUsage(userId: string, agent: AIAgent): Promise<void> {
  const key = `${agent}:messages:free:${userId}`;
  const now = Date.now();

  // Add current message timestamp
  await redis!.zadd(key, now, `msg_${now}_${Math.random()}`);

  // Set expiry to 25 hours (cleanup old keys)
  await redis!.expire(key, (ROLLING_WINDOW_HOURS + 1) * 60 * 60);
}

/**
 * Calculate when the next message will be available (when oldest expires)
 */
async function getNext24hReset(userId: string, agent: AIAgent): Promise<Date> {
  const key = `${agent}:messages:free:${userId}`;
  const oldestMessages = await redis!.zrange(key, 0, 0, 'WITHSCORES');

  if (oldestMessages.length > 0) {
    const oldestTimestamp = parseInt(oldestMessages[1]);
    return new Date(oldestTimestamp + ROLLING_WINDOW_MS);
  }

  return new Date(Date.now() + ROLLING_WINDOW_MS);
}

// --- Sage Pro: Monthly Limit + Hourly Burst Protection ---

/**
 * Check Sage Pro tier limit (5,000/month + 100/hour burst protection).
 */
async function checkSageProLimit(userId: string): Promise<RateLimitResult> {
  const month = getCurrentMonth(); // "2026-02"
  const monthlyKey = `sage:messages:pro:${userId}:${month}`;

  // Check monthly limit
  const monthlyCount = await redis!.get(monthlyKey);
  const monthlyUsed = monthlyCount ? parseInt(monthlyCount) : 0;

  if (monthlyUsed >= SAGE_PRO_MONTHLY_LIMIT) {
    return {
      allowed: false,
      tier: 'sage_pro',
      limit: SAGE_PRO_MONTHLY_LIMIT,
      used: SAGE_PRO_MONTHLY_LIMIT,
      remaining: 0,
      resetAt: getNextMonthStart(),
      error: 'monthly_limit',
      message: 'Monthly question limit reached',
    };
  }

  // Check hourly burst limit (prevent abuse/account sharing)
  const hour = getCurrentHour(); // "2026-02-17T14"
  const hourlyKey = `sage:messages:pro:${userId}:hourly:${hour}`;
  const hourlyCount = await redis!.get(hourlyKey);
  const hourlyUsed = hourlyCount ? parseInt(hourlyCount) : 0;

  if (hourlyUsed >= SAGE_PRO_HOURLY_BURST_LIMIT) {
    return {
      allowed: false,
      tier: 'sage_pro',
      limit: SAGE_PRO_MONTHLY_LIMIT, // Show monthly limit in UI
      used: monthlyUsed,
      remaining: SAGE_PRO_MONTHLY_LIMIT - monthlyUsed,
      resetAt: getNextHourStart(),
      error: 'hourly_burst_limit',
      message: `Please wait before asking more questions (max ${SAGE_PRO_HOURLY_BURST_LIMIT}/hour)`,
    };
  }

  return {
    allowed: true,
    tier: 'sage_pro',
    limit: SAGE_PRO_MONTHLY_LIMIT,
    used: monthlyUsed,
    remaining: SAGE_PRO_MONTHLY_LIMIT - monthlyUsed,
    resetAt: getNextMonthStart(),
  };
}

/**
 * Increment Sage Pro usage counters (monthly + hourly).
 */
async function incrementSageProUsage(userId: string): Promise<void> {
  const month = getCurrentMonth();
  const monthlyKey = `sage:messages:pro:${userId}:${month}`;

  // Increment monthly counter
  await redis!.incr(monthlyKey);
  // Expire at end of next month (to handle edge cases)
  await redis!.expireat(monthlyKey, getNextMonthStart().getTime() / 1000 + 30 * 24 * 60 * 60);

  // Increment hourly burst counter
  const hour = getCurrentHour();
  const hourlyKey = `sage:messages:pro:${userId}:hourly:${hour}`;
  await redis!.incr(hourlyKey);
  await redis!.expire(hourlyKey, 60 * 60); // 1 hour TTL
}

// --- Helper Functions ---

/**
 * Get current month string (YYYY-MM format)
 */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "2026-02"
}

/**
 * Get current hour string (YYYY-MM-DDTHH format)
 */
function getCurrentHour(): string {
  return new Date().toISOString().slice(0, 13); // "2026-02-17T14"
}

/**
 * Get start of next month at 00:00 UTC
 */
function getNextMonthStart(): Date {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return nextMonth;
}

/**
 * Get start of next hour
 */
function getNextHourStart(): Date {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return nextHour;
}

/**
 * Get next midnight UTC
 */
function getNextMidnightUTC(): Date {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return tomorrow;
}

// --- Subscription Management (Future) ---

/**
 * Get user's Sage subscription status.
 * For now, always returns inactive (no subscriptions yet).
 * Future: Query database for active Stripe subscription.
 */
export async function getSageSubscription(_userId: string): Promise<SubscriptionStatus> {
  // TODO: Query database when Stripe integration is ready
  // const subscription = await db.query('SELECT * FROM profiles WHERE id = $1', [_userId]);
  // if (subscription.sage_subscription_status === 'active') {
  //   return { isActive: true, plan: 'sage_pro', expiresAt: subscription.sage_subscription_expires_at };
  // }

  return { isActive: false };
}
