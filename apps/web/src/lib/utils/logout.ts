/**
 * Filename: src/lib/utils/logout.ts
 * Purpose: Robust logout utility for clearing all user-specific data
 * Created: 2026-02-01
 *
 * This utility ensures a fast, reliable logout by:
 * 1. Clearing all user-specific localStorage items synchronously
 * 2. Clearing sessionStorage items
 * 3. Starting Supabase signOut (non-blocking)
 * 4. Redirecting immediately without waiting for network
 */

import { createClient } from '@/utils/supabase/client';

/**
 * Patterns for user-specific localStorage keys that should be cleared on logout.
 * These contain user data that shouldn't persist between different users.
 */
const USER_SPECIFIC_PATTERNS = [
  // Role and preferences
  'activeRole',
  'rolePreferences',

  // Temporary saves and drafts
  'temp_saves',
  'one_to_one_draft',
  'group_session_draft',
  'study_package_draft',
  'workshop_draft',
  'client_request_draft',
  'job_listing_draft',

  // Saved articles
  'tutorwise_saved_articles',
  'tutorwise_saved_articles_data',
];

/**
 * Prefixes for localStorage keys that should be cleared on logout.
 * Any key starting with these prefixes will be removed.
 */
const USER_SPECIFIC_PREFIXES = [
  'wisespace_meet_',      // Meeting session data
  'hub_saved_views_',     // Hub table saved views
  'offline_queue_',       // Offline queue data
  'draft_',               // Draft sync data
  'org_trial_dismissed_', // Trial dismissal flags
  'article_draft_',       // Article editor drafts
  'onboarding-',          // Onboarding draft data
];

/**
 * Keys that should NOT be cleared on logout.
 * These are device-level or analytics identifiers.
 */
const PRESERVE_KEYS = [
  'device_id',              // Device identifier for sync
  'help_centre_session_id', // Help centre analytics session
];

/**
 * Clears all user-specific data from localStorage and sessionStorage.
 * This is synchronous and fast.
 */
export function clearUserData(): void {
  try {
    // Clear exact-match keys
    USER_SPECIFIC_PATTERNS.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear keys matching prefixes
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      // Skip preserved keys
      if (PRESERVE_KEYS.includes(key)) return;

      // Check if key matches any prefix pattern
      const shouldClear = USER_SPECIFIC_PREFIXES.some(prefix =>
        key.startsWith(prefix)
      );

      if (shouldClear) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage (all of it - session-specific data)
    sessionStorage.clear();

  } catch (error) {
    // localStorage might not be available (e.g., private browsing on some browsers)
    console.warn('Could not clear localStorage:', error);
  }
}

/**
 * Performs a complete logout:
 * 1. Clears user data (synchronous, instant)
 * 2. Starts Supabase signOut (non-blocking, happens in background)
 * 3. Redirects to homepage (instant)
 *
 * This function does NOT await the signOut network call, making logout feel instant.
 * The session cookies are cleared synchronously by Supabase before the network call.
 *
 * @param redirectUrl - URL to redirect to after logout (default: '/')
 */
export function performLogout(redirectUrl: string = '/'): void {
  // 1. Clear all user-specific data immediately (synchronous)
  clearUserData();

  // 2. Start Supabase signOut (non-blocking)
  // The signOut method:
  // - Clears cookies synchronously (immediate)
  // - Clears Supabase localStorage items synchronously (immediate)
  // - Makes network call to revoke tokens (async, we don't wait)
  try {
    const supabase = createClient();
    supabase.auth.signOut({ scope: 'global' }).catch(error => {
      // Log but don't block - user is already logged out locally
      console.error('Logout network error (non-blocking):', error);
    });
  } catch (error) {
    // Supabase client creation failed - still redirect
    console.error('Logout error:', error);
  }

  // 3. Redirect immediately - don't wait for network round-trip
  window.location.href = redirectUrl;
}
