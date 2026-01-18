/**
 * Filename: apps/web/src/app/components/resources/embeds/useResourceAttribution.ts
 * Purpose: Client-side event-based attribution tracking for resource embeds
 * Created: 2026-01-16
 *
 * Implements event-based attribution architecture:
 * - Writes immutable events to blog_attribution_events table (source of truth)
 * - Uses session tracking (hybrid client UUID in cookie)
 * - Generates stable embed instance IDs for performance comparison
 *
 * Migration from localStorage-based to event-based tracking:
 * - Old: localStorage as source of truth (risk: purges, multi-device)
 * - New: blog_attribution_events table as canonical truth
 * - localStorage still used for session bridging during anonymous → logged-in transition
 */

'use client';

import { useEffect, useState } from 'react';
import { getOrCreateSessionId } from '@/lib/utils/sessionTracking';
import { generateEmbedInstanceId, type EmbedComponent } from '@/lib/utils/embedInstanceId';

/**
 * Event types in attribution taxonomy
 */
export type AttributionEventType = 'impression' | 'click' | 'save' | 'refer' | 'convert';

/**
 * Target types in attribution taxonomy
 */
export type AttributionTargetType = 'article' | 'tutor' | 'listing' | 'booking' | 'referral' | 'wiselist_item';

/**
 * Hook for resource attribution tracking with event-based architecture
 *
 * This hook manages all resource-to-marketplace attribution tracking.
 * It writes immutable events to the database (source of truth) and provides
 * session/embed identifiers for performance analysis.
 *
 * @param articleId - Current resource article ID
 * @param component - Component type (e.g., 'tutor_embed', 'listing_grid')
 * @param position - Zero-indexed position in article (default: 0)
 * @returns Attribution tracking functions and IDs
 *
 * @example
 * ```typescript
 * const { trackEvent, sessionId, embedInstanceId } = useResourceAttribution(
 *   article.id,
 *   'tutor_embed',
 *   0
 * );
 *
 * // Track click event when user clicks embedded tutor
 * await trackEvent({
 *   event_type: 'click',
 *   target_type: 'tutor',
 *   target_id: profileId,
 *   metadata: { context: 'recommended' }
 * });
 *
 * // Track conversion when booking is created
 * await trackEvent({
 *   event_type: 'convert',
 *   target_type: 'booking',
 *   target_id: bookingId,
 *   metadata: { listing_id: listingId }
 * });
 * ```
 */
export function useResourceAttribution(articleId: string, component: EmbedComponent, position: number = 0) {
  const [sessionId, setSessionId] = useState<string>('');
  const [embedInstanceId, setEmbedInstanceId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setSessionId(getOrCreateSessionId());
    setEmbedInstanceId(generateEmbedInstanceId(articleId, component, position));
  }, [articleId, component, position]);

  /**
   * Track an attribution event
   *
   * Writes event to blog_attribution_events table (immutable source of truth).
   * This is the canonical way to record resource-to-marketplace interactions.
   *
   * Events are immutable and represent evidence, not conclusions.
   * Attribution models (first-touch, last-touch) are derived at query time.
   *
   * @param data - Event data
   * @param data.event_type - Type of event ('impression', 'click', 'save', 'refer', 'convert')
   * @param data.target_type - Type of target ('article', 'tutor', 'listing', 'booking', 'referral', 'wiselist_item')
   * @param data.target_id - UUID of target object
   * @param data.metadata - Additional context (optional)
   * @returns Promise resolving to event ID or null on error
   *
   * @example
   * ```typescript
   * // Track click on embedded tutor
   * const eventId = await trackEvent({
   *   event_type: 'click',
   *   target_type: 'tutor',
   *   target_id: '550e8400-e29b-41d4-a716-446655440000',
   *   metadata: { context: 'recommended', tutor_name: 'John Doe' }
   * });
   *
   * // Track wiselist save
   * await trackEvent({
   *   event_type: 'save',
   *   target_type: 'wiselist_item',
   *   target_id: wiselistItemId,
   *   metadata: { wiselist_id: wiselistId, item_type: 'tutor' }
   * });
   * ```
   */
  const trackEvent = async (data: {
    event_type: AttributionEventType;
    target_type: AttributionTargetType;
    target_id: string;
    metadata?: Record<string, any>;
  }): Promise<string | null> => {
    if (!isClient || !sessionId) {
      console.warn('[useResourceAttribution] Cannot track event: client not initialized');
      return null;
    }

    try {
      const response = await fetch('/api/resources/attribution/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: articleId,
          event_type: data.event_type,
          target_type: data.target_type,
          target_id: data.target_id,
          source_component: component,
          session_id: sessionId,
          metadata: {
            embed_instance_id: embedInstanceId,
            position,
            ...data.metadata,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useResourceAttribution] Failed to track event:', errorText);
        return null;
      }

      const result = await response.json();

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[useResourceAttribution] Event tracked:', {
          event_id: result.event_id,
          event_type: data.event_type,
          target_type: data.target_type,
          target_id: data.target_id,
          session_id: sessionId,
          embed_instance_id: embedInstanceId,
        });
      }

      return result.event_id || null;
    } catch (error) {
      console.error('[useResourceAttribution] Error tracking event:', error);
      return null;
    }
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

  return {
    trackEvent,
    sessionId,
    embedInstanceId,
    getSessionId,
    getEmbedInstanceId,
  };
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
 * import { getSessionIdStandalone } from './useResourceAttribution';
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
