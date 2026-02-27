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
  'virtualspace_meet_',   // Meeting session data
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
 * 2. Signs out from Supabase (waits for completion)
 * 3. Redirects to homepage
 *
 * This function waits for signOut to complete to ensure session cookies are fully cleared
 * before redirecting to prevent seeing stale user data on the redirect page.
 *
 * @param redirectUrl - URL to redirect to after logout (default: '/')
 */
export async function performLogout(redirectUrl: string = '/'): Promise<void> {
  // 1. Clear all user-specific data immediately (synchronous)
  clearUserData();

  // 2. Sign out from Supabase and wait for completion
  try {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'global' });
  } catch (error) {
    // Log error but continue with redirect
    console.error('Logout error:', error);
  }

  // 3. Redirect after signOut is complete
  window.location.href = redirectUrl;
}
