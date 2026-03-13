/**
 * Filename: apps/web/src/app/components/resources/embeds/useSignalTracking.ts
 * Purpose: Client-side journey tracking for Revenue Signal with signal_id
 * Created: 2026-01-17 (migrated from useResourceAttribution.ts)
 *
 * Implements signal-based journey tracking architecture:
 * - Writes immutable events to signal_events table (source of truth)
 * - Uses signal_id for multi-touch attribution across sessions (Datadog-inspired)
 * - Supports both distribution signals (dist_*) and session signals (session_*)
 * - Generates stable embed instance IDs for performance comparison
 *
 * Migration from blog_* to signal_*:
 * - Old: blog_attribution_events (resource-specific)
 * - New: signal_events (content-agnostic, extensible to podcasts/videos)
 */

'use client';

import { useEffect, useState } from 'react';
import { getOrCreateSessionId } from '@/lib/utils/sessionTracking';
import { getOrCreateSignalId } from '@/lib/utils/signalTracking';
import { generateEmbedInstanceId, type EmbedComponent } from '@/lib/utils/embedInstanceId';

/**
 * Event types in signal taxonomy
 */
export type SignalEventType = 'impression' | 'click' | 'save' | 'refer' | 'convert';

/**
 * Target types in signal taxonomy
 */
export type SignalTargetType = 'article' | 'tutor' | 'listing' | 'booking' | 'referral' | 'wiselist_item';

/**
 * Content types supported by signal tracking
 */
export type SignalContentType = 'article' | 'podcast' | 'video' | 'webinar';

/**
 * Hook for signal tracking with journey-based attribution
 *
 * This hook manages all content-to-marketplace attribution tracking using signal_id
 * for multi-touch attribution across sessions (similar to Datadog's trace_id).
 *
 * @param contentId - Current content ID (article, podcast, etc.)
 * @param component - Component type (e.g., 'tutor_embed', 'listing_grid')
 * @param contentType - Content type (default: 'article')
 * @param position - Zero-indexed position in content (default: 0)
 * @returns Signal tracking functions and IDs
 *
 * @example
 * ```typescript
 * const { trackEvent, signalId, sessionId, embedInstanceId } = useSignalTracking(
 *   article.id,
 *   'tutor_embed',
 *   'article',
 *   0
 * );
 *
 * // Track click event when user clicks embedded tutor
 * await trackEvent({
 *   eventType: 'click',
 *   targetType: 'tutor',
 *   targetId: profileId,
 *   metadata: { context: 'recommended' }
 * });
 *
 * // Track conversion when booking is created
 * await trackEvent({
 *   eventType: 'convert',
 *   targetType: 'booking',
 *   targetId: bookingId,
 *   metadata: { listing_id: listingId }
 * });
 * ```
 */
export function useSignalTracking(
  contentId: string,
  component: EmbedComponent,
  contentType: SignalContentType = 'article',
  position: number = 0
) {
  const [signalId, setSignalId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [embedInstanceId, setEmbedInstanceId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Get or create signal_id (checks for distribution from middleware)
    const currentSignalId = getOrCreateSignalId();
    setSignalId(currentSignalId);

    // Get session ID (30-day cookie)
    setSessionId(getOrCreateSessionId());

    // Generate stable embed instance ID
    setEmbedInstanceId(generateEmbedInstanceId(contentId, component, position));
  }, [contentId, component, position]);

  /**
   * Track a signal event
   *
   * Writes event to signal_events table (immutable source of truth).
   * Links events using signal_id for journey tracking across sessions.
   *
   * Events are immutable and represent evidence, not conclusions.
   * Attribution models (first-touch, last-touch, linear) are derived at query time.
   *
   * @param data - Event data
   * @param data.eventType - Type of event ('impression', 'click', 'save', 'refer', 'convert')
   * @param data.targetType - Type of target ('article', 'tutor', 'listing', 'booking', 'referral', 'wiselist_item')
   * @param data.targetId - UUID of target object
   * @param data.metadata - Additional context (optional)
   * @returns Promise resolving to event ID or null on error
   *
   * @example
   * ```typescript
   * // Track click on embedded tutor
   * const eventId = await trackEvent({
   *   eventType: 'click',
   *   targetType: 'tutor',
   *   targetId: '550e8400-e29b-41d4-a716-446655440000',
   *   metadata: { context: 'recommended', tutor_name: 'John Doe' }
   * });
   *
   * // Track wiselist save
   * await trackEvent({
   *   eventType: 'save',
   *   targetType: 'wiselist_item',
   *   targetId: wiselistItemId,
   *   metadata: { wiselist_id: wiselistId, item_type: 'tutor' }
   * });
   * ```
   */
  const trackEvent = async (data: {
    eventType: SignalEventType;
    targetType: SignalTargetType;
    targetId: string;
    metadata?: Record<string, any>;
  }): Promise<string | null> => {
    if (!isClient || !sessionId || !signalId) {
      console.warn('[useSignalTracking] Cannot track event: client not initialized');
      return null;
    }

    try {
      // Get distribution ID from cookie (if set by middleware)
      const distributionId = document.cookie
        .split('; ')
        .find(c => c.startsWith('tw_distribution_id='))
        ?.split('=')[1];

      const response = await fetch('/api/resources/attribution/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_id: signalId,              // NEW: Journey tracking ID
          content_id: contentId,            // Renamed from blog_article_id
          content_type: contentType,        // NEW: Extensible to podcast/video
          event_type: data.eventType,
          target_type: data.targetType,
          target_id: data.targetId,
          source_component: component,
          session_id: sessionId,
          metadata: {
            embed_instance_id: embedInstanceId,
            position,
            distribution_id: distributionId || undefined, // Track distribution source
            ...data.metadata,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useSignalTracking] Failed to track event:', errorText);
        return null;
      }

      const result = await response.json();

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[useSignalTracking] Event tracked:', {
          event_id: result.event_id,
          signal_id: signalId,
          event_type: data.eventType,
          target_type: data.targetType,
          target_id: data.targetId,
          session_id: sessionId,
          embed_instance_id: embedInstanceId,
          is_distribution: signalId.startsWith('dist_'),
        });
      }

      return result.event_id || null;
    } catch (error) {
      console.error('[useSignalTracking] Error tracking event:', error);
      return null;
    }
  };

  /**
   * Get signal ID for current journey
   *
   * Signal ID links all events in a user journey across sessions.
   * Format: "dist_[id]" for distribution traffic, "session_[uuid]" for organic.
   *
   * @returns Signal ID
   *
   * @example
   * ```typescript
   * const signalId = getSignalId();
   * // Returns: "dist_abc123" or "session_550e8400-e29b-41d4-a716-446655440000"
   * ```
   */
  const getSignalId = (): string => {
    return signalId;
  };

  /**
   * Get session ID for current user
   *
   * Session ID persists across navigation and login/logout.
   * Use this for server-side API calls that need session context.
   *
   * @returns Session ID (UUID v4 format)
   *
   * @example
   * ```typescript
   * const sessionId = getSessionId();
   * // Returns: "550e8400-e29b-41d4-a716-446655440000"
   * ```
   */
  const getSessionId = (): string => {
    return sessionId;
  };

  /**
   * Get embed instance ID for current component
   *
   * Stable hash-based ID that's the same across different users.
   * Use this for performance comparison queries.
   *
   * @returns Embed instance ID (format: "embed_[hash]")
   *
   * @example
   * ```typescript
   * const embedId = getEmbedInstanceId();
   * // Returns: "embed_1a2b3c4d"
   * ```
   */
  const getEmbedInstanceId = (): string => {
    return embedInstanceId;
  };

  /**
   * Check if current signal is from distribution (LinkedIn, social, etc.)
   *
   * @returns True if signal_id starts with "dist_"
   */
  const isDistributionSignal = (): boolean => {
    return signalId.startsWith('dist_');
  };

  /**
   * Check if current signal is from organic session
   *
   * @returns True if signal_id starts with "session_"
   */
  const isOrganicSignal = (): boolean => {
    return signalId.startsWith('session_');
  };

  return {
    trackEvent,
    signalId,
    sessionId,
    embedInstanceId,
    getSignalId,
    getSessionId,
    getEmbedInstanceId,
    isDistributionSignal,
    isOrganicSignal,
  };
}

/**
 * Standalone function to get signal ID without React hook
 *
 * Useful in API routes, server actions, or non-component contexts.
 *
 * @returns Signal ID (dist_* or session_* format)
 *
 * @example
 * ```typescript
 * // In an API route
 * import { getSignalIdStandalone } from './useSignalTracking';
 *
 * export async function POST(request: NextRequest) {
 *   const signalId = getSignalIdStandalone();
 *   // Use signalId for tracking
 * }
 * ```
 */
export function getSignalIdStandalone(): string {
  return getOrCreateSignalId();
}

/**
 * Standalone function to get session ID without React hook
 *
 * Useful in API routes, server actions, or non-component contexts.
 *
 * @returns Session ID (UUID v4 format)
 *
 * @example
 * ```typescript
 * // In an API route
 * import { getSessionIdStandalone } from './useSignalTracking';
 *
 * export async function POST(request: NextRequest) {
 *   const sessionId = getSessionIdStandalone();
 *   // Use sessionId for tracking
 * }
 * ```
 */
export function getSessionIdStandalone(): string {
  return getOrCreateSessionId();
}
