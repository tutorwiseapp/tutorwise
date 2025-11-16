/**
 * Filename: useFreeHelpHeartbeat.ts
 * Purpose: React hook for Free Help Now heartbeat system (v5.9)
 * Created: 2025-11-16
 *
 * This hook manages the 4-minute heartbeat interval for tutors offering free help.
 * It automatically sends heartbeat requests to refresh the 5-minute Redis TTL.
 */

import { useEffect, useRef } from 'react';

const HEARTBEAT_INTERVAL = 4 * 60 * 1000; // 4 minutes in milliseconds

interface UseFreeHelpHeartbeatOptions {
  enabled: boolean;
  onExpired?: () => void;
}

export function useFreeHelpHeartbeat({ enabled, onExpired }: UseFreeHelpHeartbeatOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run heartbeat if enabled
    if (!enabled) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send heartbeat function
    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/presence/free-help/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const data = await response.json();

          // 410 Gone means presence expired
          if (response.status === 410) {
            console.warn('[Free Help Heartbeat] Presence expired');
            if (onExpired) {
              onExpired();
            }
            // Clear interval since we're no longer online
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          } else {
            console.error('[Free Help Heartbeat] Error:', data);
          }
        } else {
          console.log('[Free Help Heartbeat] Success');
        }
      } catch (error) {
        console.error('[Free Help Heartbeat] Network error:', error);
      }
    };

    // Start interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Cleanup on unmount or when enabled changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, onExpired]);
}
