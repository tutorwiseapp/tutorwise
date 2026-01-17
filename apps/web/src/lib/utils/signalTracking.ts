/**
 * Signal Tracking Utilities
 *
 * Provides journey tracking using signal_id (Datadog-inspired trace_id pattern).
 * Links all events in a user journey across sessions for multi-touch attribution.
 *
 * @module signalTracking
 */

import { v4 as uuidv4 } from 'uuid';

const SIGNAL_ID_COOKIE = 'tw_signal_id';
const DISTRIBUTION_ID_COOKIE = 'tw_distribution_id';
const DISTRIBUTION_WINDOW_DAYS = 7;  // LinkedIn attribution window
const ORGANIC_WINDOW_DAYS = 30;       // Organic session window

/**
 * Get or create signal_id for journey tracking
 *
 * Priority:
 * 1. Distribution-specific signal (from ?d= param via middleware)
 * 2. Existing session signal (from cookie)
 * 3. New session signal (generate UUID)
 *
 * @param distributionId - Optional distribution ID from ?d= parameter
 * @returns Signal ID for tracking this user journey
 *
 * @example
 * // Organic traffic - creates session signal
 * const signalId = getOrCreateSignalId(); // "session_abc-123..."
 *
 * @example
 * // Distribution traffic - creates distribution signal
 * const signalId = getOrCreateSignalId('dist_123'); // "dist_dist_123"
 */
export function getOrCreateSignalId(distributionId?: string): string {
  // Priority 1: Distribution-specific signal (from middleware cookie)
  const cookieDistId = getDistributionIdFromCookie();
  if (cookieDistId) {
    const signalId = `dist_${cookieDistId}`;
    // Refresh cookie expiration
    setSignalCookie(signalId, DISTRIBUTION_WINDOW_DAYS);
    return signalId;
  }

  // Priority 2: Distribution ID passed directly (fallback)
  if (distributionId) {
    const signalId = `dist_${distributionId}`;
    setSignalCookie(signalId, DISTRIBUTION_WINDOW_DAYS);
    setDistributionIdCookie(distributionId, DISTRIBUTION_WINDOW_DAYS);
    return signalId;
  }

  // Priority 3: Existing session signal
  let signalId = getSignalCookie();
  if (signalId) {
    return signalId;
  }

  // Priority 4: New session signal
  signalId = `session_${uuidv4()}`;
  setSignalCookie(signalId, ORGANIC_WINDOW_DAYS);
  return signalId;
}

/**
 * Get signal_id from cookie
 */
function getSignalCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const signalCookie = cookies.find(c => c.startsWith(`${SIGNAL_ID_COOKIE}=`));

  if (!signalCookie) return null;

  return signalCookie.split('=')[1];
}

/**
 * Get distribution_id from cookie (set by middleware)
 */
function getDistributionIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const distCookie = cookies.find(c => c.startsWith(`${DISTRIBUTION_ID_COOKIE}=`));

  if (!distCookie) return null;

  return distCookie.split('=')[1];
}

/**
 * Set signal_id cookie with expiration
 */
function setSignalCookie(signalId: string, days: number): void {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  document.cookie = `${SIGNAL_ID_COOKIE}=${signalId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

/**
 * Set distribution_id cookie (called when ?d= param detected)
 */
function setDistributionIdCookie(distributionId: string, days: number): void {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  document.cookie = `${DISTRIBUTION_ID_COOKIE}=${distributionId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

/**
 * Clear signal_id cookie (for testing/debugging)
 */
export function clearSignalId(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SIGNAL_ID_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${DISTRIBUTION_ID_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Get current signal_id without creating new one
 *
 * @returns Current signal ID or null if none exists
 */
export function getCurrentSignalId(): string | null {
  return getSignalCookie();
}

/**
 * Check if current signal is from distribution (LinkedIn, social, etc.)
 *
 * @returns True if signal_id starts with "dist_"
 */
export function isDistributionSignal(): boolean {
  const signalId = getSignalCookie();
  return signalId ? signalId.startsWith('dist_') : false;
}

/**
 * Check if current signal is from organic session
 *
 * @returns True if signal_id starts with "session_"
 */
export function isOrganicSignal(): boolean {
  const signalId = getSignalCookie();
  return signalId ? signalId.startsWith('session_') : false;
}
