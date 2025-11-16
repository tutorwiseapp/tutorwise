/**
 * Filename: redis.ts
 * Purpose: Redis client for Free Help Now presence system (v5.9)
 * Created: 2025-11-16
 *
 * Redis is used to track real-time tutor availability with TTL-based expiry.
 * Keys expire after 5 minutes without heartbeat, automatically setting tutors offline.
 */

import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
// Uses REST API, so no persistent connections required (perfect for serverless)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key prefix for free help presence
const PRESENCE_KEY_PREFIX = 'presence:free-help:';

// TTL for presence keys (5 minutes in seconds)
const PRESENCE_TTL = 5 * 60; // 300 seconds

/**
 * Set tutor as available for free help
 * Creates a Redis key with 5-minute expiry
 */
export async function setTutorOnline(tutorId: string): Promise<void> {
  const key = `${PRESENCE_KEY_PREFIX}${tutorId}`;
  await redis.set(key, Date.now(), { ex: PRESENCE_TTL });
}

/**
 * Remove tutor from free help availability
 * Deletes the Redis key immediately
 */
export async function setTutorOffline(tutorId: string): Promise<void> {
  const key = `${PRESENCE_KEY_PREFIX}${tutorId}`;
  await redis.del(key);
}

/**
 * Refresh tutor's presence heartbeat
 * Resets the 5-minute expiry timer
 */
export async function refreshTutorHeartbeat(tutorId: string): Promise<boolean> {
  const key = `${PRESENCE_KEY_PREFIX}${tutorId}`;

  // Check if key exists
  const exists = await redis.exists(key);

  if (exists) {
    // Refresh TTL
    await redis.set(key, Date.now(), { ex: PRESENCE_TTL });
    return true;
  }

  return false;
}

/**
 * Check if tutor is currently online for free help
 */
export async function isTutorOnline(tutorId: string): Promise<boolean> {
  const key = `${PRESENCE_KEY_PREFIX}${tutorId}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Get all currently online tutors
 * Returns array of tutor IDs
 */
export async function getOnlineTutors(): Promise<string[]> {
  // Scan for all presence keys
  const keys = await redis.keys(`${PRESENCE_KEY_PREFIX}*`);

  // Extract tutor IDs from keys
  return keys.map(key => key.replace(PRESENCE_KEY_PREFIX, ''));
}
