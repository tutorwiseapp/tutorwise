/**
 * Filename: redis.ts
 * Purpose: Redis client for Free Help Now presence system (v5.9)
 * Created: 2025-11-16
 * Updated: 2026-01-18 - Switched to ioredis for Redis Cloud compatibility
 *
 * Redis is used to track real-time tutor availability with TTL-based expiry.
 * Keys expire after 5 minutes without heartbeat, automatically setting tutors offline.
 *
 * Architecture:
 * - Uses ioredis for traditional Redis protocol (Redis Cloud)
 * - Lazy connection (only connects when first command is executed)
 * - Automatic retries on connection failures
 * - Gracefully handles missing credentials
 */

import Redis from 'ioredis';

// Initialize Redis client only if REDIS_URL is provided
// Uses traditional Redis protocol with connection pooling
const hasRedisCredentials = !!process.env.REDIS_URL;

export const redis = hasRedisCredentials
  ? new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        // Stop retrying after 5 attempts to avoid flooding logs when Redis is unreachable
        if (times > 5) return null;
        // Exponential backoff: 50ms, 100ms, 200ms, max 2000ms
        return Math.min(times * 50, 2000);
      },
      lazyConnect: true, // Don't connect until first command
      enableReadyCheck: true,
      // Connection timeout
      connectTimeout: 10000,
      // Reconnect on error
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
    })
  : null;

// Attach error handler to prevent unhandled ioredis error events from flooding the console
if (redis) {
  let errorLogged = false;
  redis.on('error', (err) => {
    if (!errorLogged) {
      console.warn('[Redis] Connection error (further errors suppressed):', err.message);
      errorLogged = true;
    }
  });
  redis.on('connect', () => {
    errorLogged = false; // Reset so we log again if it disconnects later
  });
}

// Key prefix for free help presence
const PRESENCE_KEY_PREFIX = 'presence:free-help:';

// TTL for presence keys (5 minutes in seconds)
const PRESENCE_TTL = 5 * 60; // 300 seconds

/**
 * Set tutor as available for free help
 * Creates a Redis key with 5-minute expiry
 */
export async function setTutorOnline(tutorId: string): Promise<void> {
  if (!redis) {
    console.warn('[Redis] REDIS_URL not configured, skipping setTutorOnline');
    return;
  }
  const key = `${PRESENCE_KEY_PREFIX}${tutorId}`;
  // ioredis: SET key value EX seconds
  await redis.set(key, Date.now().toString(), 'EX', PRESENCE_TTL);
}

/**
 * Remove tutor from free help availability
 * Deletes the Redis key immediately
 */
export async function setTutorOffline(tutorId: string): Promise<void> {
  if (!redis) {
    console.warn('[Redis] REDIS_URL not configured, skipping setTutorOffline');
    return;
  }
  const key = `${PRESENCE_KEY_PREFIX}${tutorId}`;
  await redis.del(key);
}

/**
 * Refresh tutor's presence heartbeat
 * Resets the 5-minute expiry timer
 */
export async function refreshTutorHeartbeat(tutorId: string): Promise<boolean> {
  if (!redis) {
    console.warn('[Redis] REDIS_URL not configured, skipping refreshTutorHeartbeat');
    return false;
  }
  const key = `${PRESENCE_KEY_PREFIX}${tutorId}`;

  // Check if key exists
  const exists = await redis.exists(key);

  if (exists === 1) {
    // Refresh TTL
    await redis.set(key, Date.now().toString(), 'EX', PRESENCE_TTL);
    return true;
  }

  return false;
}

/**
 * Check if tutor is currently online for free help
 */
export async function isTutorOnline(tutorId: string): Promise<boolean> {
  if (!redis) {
    console.warn('[Redis] REDIS_URL not configured, skipping isTutorOnline');
    return false;
  }
  const key = `${PRESENCE_KEY_PREFIX}${tutorId}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Get all currently online tutors
 * Returns array of tutor IDs
 */
export async function getOnlineTutors(): Promise<string[]> {
  if (!redis) {
    console.warn('[Redis] REDIS_URL not configured, returning empty array');
    return [];
  }
  // Scan for all presence keys
  const keys = await redis.keys(`${PRESENCE_KEY_PREFIX}*`);

  // Extract tutor IDs from keys
  return keys.map(key => key.replace(PRESENCE_KEY_PREFIX, ''));
}
