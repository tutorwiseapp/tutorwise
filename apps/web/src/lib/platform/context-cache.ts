/*
 * Filename: src/lib/platform/context-cache.ts
 * Purpose: Redis cache for PlatformUserContext (5-minute TTL)
 * Phase: Conductor 4C
 * Created: 2026-03-10
 */

import { redis } from '@/lib/redis';
import type { PlatformUserContext } from './user-context';

const KEY_PREFIX = 'platform-ctx:';
const TTL_SECONDS = 300; // 5 minutes

/**
 * Cache a PlatformUserContext in Redis.
 * Fails silently if Redis is unavailable.
 */
export async function setCachedContext(userId: string, ctx: PlatformUserContext): Promise<void> {
  if (!redis) return;
  try {
    await (redis as any).set(
      `${KEY_PREFIX}${userId}`,
      JSON.stringify(ctx),
      'EX',
      TTL_SECONDS
    );
  } catch (error) {
    console.warn('[context-cache] Failed to set cache:', error);
  }
}

/**
 * Retrieve a cached PlatformUserContext from Redis.
 * Returns null if not cached or Redis unavailable.
 */
export async function getCachedContext(userId: string): Promise<PlatformUserContext | null> {
  if (!redis) return null;
  try {
    const raw = await (redis as any).get(`${KEY_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PlatformUserContext;
  } catch (error) {
    console.warn('[context-cache] Failed to get cache:', error);
    return null;
  }
}

/**
 * Invalidate a user's cached context (call after profile updates, etc.)
 */
export async function invalidateCachedContext(userId: string): Promise<void> {
  if (!redis) return;
  try {
    await (redis as any).del(`${KEY_PREFIX}${userId}`);
  } catch (error) {
    console.warn('[context-cache] Failed to invalidate cache:', error);
  }
}
