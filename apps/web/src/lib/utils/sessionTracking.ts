/**
 * Filename: apps/web/src/lib/utils/sessionTracking.ts
 * Purpose: Session management for resource attribution tracking
 * Created: 2026-01-16
 *
 * Implements hybrid session tracking (Option B from plan):
 * - Client-generated UUID stored in cookie
 * - Survives navigation and login
 * - Session ≠ auth (session persists even when logging in/out)
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Cookie name for session ID
 */
export const SESSION_COOKIE_NAME = 'tutorwise_session_id';

/**
 * Session duration (30 days in milliseconds)
 */
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }

  return null;
}

/**
 * Set cookie with name, value, and duration
 */
function setCookie(name: string, value: string, durationMs: number): void {
  if (typeof document === 'undefined') return;

  const expires = new Date(Date.now() + durationMs).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

/**
 * Get or create session ID
 *
 * Returns existing session ID from cookie, or generates new one if not found.
 * Session persists for 30 days and survives login/logout.
 *
 * @returns Session ID (UUID v4 format)
 *
 * @example
 * ```typescript
 * const sessionId = getOrCreateSessionId();
 * // Returns: "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function getOrCreateSessionId(): string {
  // Try to get existing session ID from cookie
  let sessionId = getCookie(SESSION_COOKIE_NAME);

  if (!sessionId) {
    // Generate new session ID
    sessionId = uuidv4();

    // Store in cookie (30 days)
    setCookie(SESSION_COOKIE_NAME, sessionId, SESSION_DURATION_MS);
  }

  return sessionId;
}

/**
 * Refresh session cookie expiry
 *
 * Extends the session cookie by another 30 days.
 * Call this on page load to keep active users' sessions alive.
 */
export function refreshSessionCookie(): void {
  const sessionId = getCookie(SESSION_COOKIE_NAME);

  if (sessionId) {
    setCookie(SESSION_COOKIE_NAME, sessionId, SESSION_DURATION_MS);
  }
}

/**
 * Clear session cookie
 *
 * Removes session ID from cookie. Use sparingly - sessions should
 * persist across navigation and auth state changes.
 */
export function clearSessionCookie(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Check if session ID exists
 *
 * @returns true if session cookie is set
 */
export function hasSessionId(): boolean {
  return getCookie(SESSION_COOKIE_NAME) !== null;
}
