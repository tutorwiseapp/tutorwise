/**
 * Filename: OrganisationViewTracker.tsx
 * Purpose: Client component to track organisation profile views
 * Created: 2025-12-31
 *
 * Tracks organisation views with:
 * - Session-based deduplication (max 1 view per 24 hours per session)
 * - Anonymous and authenticated user tracking
 * - Referrer source tracking
 */
'use client';

import { useEffect, useRef } from 'react';

interface OrganisationViewTrackerProps {
  organisationId: string;
  referrerSource?: string;
}

export function OrganisationViewTracker({ organisationId, referrerSource }: OrganisationViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (tracked.current) return;
    tracked.current = true;

    const trackView = async () => {
      try {
        // Generate or retrieve session ID from sessionStorage
        let sessionId = sessionStorage.getItem('viewer_session_id');
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('viewer_session_id', sessionId);
        }

        // Track the view
        await fetch(`/api/org/${organisationId}/track-view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            referrer_source: referrerSource || document.referrer || 'direct',
          }),
        });

        // Silently fail - don't show errors to user
      } catch (error) {
        // Log error but don't disrupt user experience
        console.debug('Organisation view tracking failed:', error);
      }
    };

    // Track after a short delay to ensure page is fully loaded
    const timeoutId = setTimeout(trackView, 1000);

    return () => clearTimeout(timeoutId);
  }, [organisationId, referrerSource]);

  // This component doesn't render anything
  return null;
}
