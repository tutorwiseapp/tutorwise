/**
 * Filename: apps/web/src/app/hooks/useAblyPresence.tsx
 * Purpose: Custom React hook for Ably real-time presence tracking
 * Created: 2025-11-08
 */

'use client';

import { useState, useEffect } from 'react';
import { getAblyClientClient, AblyChannels } from '@/lib/ably';
import type * as Ably from 'ably';

export interface PresenceStatus {
  isOnline: boolean;
  lastSeen?: Date;
}

/**
 * Hook to track online/offline status of a user via Ably Presence
 * @param targetUserId - The user ID to track
 * @param currentUserId - The current user's ID (for client initialization)
 * @returns PresenceStatus object with isOnline and lastSeen
 */
export function useAblyPresence(
  targetUserId: string | null | undefined,
  currentUserId: string
): PresenceStatus {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!targetUserId) {
      setIsOnline(false);
      return;
    }

    let ablyClient: Ably.Realtime | null = null;
    let channel: Ably.RealtimeChannel | null = null;
    let mounted = true;

    const initializePresence = async () => {
      try {
        // Initialize Ably client
        ablyClient = getAblyClientClient(currentUserId);

        // Gracefully handle missing Ably configuration
        if (!ablyClient) {
          console.warn('[useAblyPresence] Ably not configured - presence tracking disabled');
          return;
        }

        // Get presence channel for target user
        const channelName = AblyChannels.userPresence(targetUserId);
        channel = ablyClient.channels.get(channelName);

        // Subscribe to presence events
        channel.presence.subscribe('enter', () => {
          if (mounted) {
            setIsOnline(true);
            setLastSeen(new Date());
          }
        });

        channel.presence.subscribe('leave', () => {
          if (mounted) {
            setIsOnline(false);
            setLastSeen(new Date());
          }
        });

        channel.presence.subscribe('update', () => {
          if (mounted) {
            setLastSeen(new Date());
          }
        });

        // Get initial presence state
        channel.presence.get().then((members) => {
          if (mounted && members) {
            const isPresent = members.length > 0;
            setIsOnline(isPresent);
            if (isPresent && members[0]?.timestamp) {
              setLastSeen(new Date(members[0].timestamp));
            }
          }
        }).catch((error) => {
          console.error('[useAblyPresence] Error getting initial presence:', error);
        });
      } catch (error) {
        console.error('[useAblyPresence] Failed to initialize presence:', error);
        if (mounted) {
          setIsOnline(false);
        }
      }
    };

    initializePresence();

    // Cleanup
    return () => {
      mounted = false;
      if (channel) {
        channel.presence.unsubscribe();
        channel.detach();
      }
      if (ablyClient) {
        ablyClient.close();
      }
    };
  }, [targetUserId, currentUserId]);

  return { isOnline, lastSeen };
}

/**
 * Hook to broadcast current user's presence status
 * @param currentUserId - The current user's ID
 * @param enabled - Whether to enable presence broadcasting (default: true)
 */
export function useAblyPresenceBroadcast(
  currentUserId: string,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    let ablyClient: Ably.Realtime | null = null;
    let channel: Ably.RealtimeChannel | null = null;

    const initializePresence = async () => {
      try {
        // Initialize Ably client
        ablyClient = getAblyClientClient(currentUserId);

        // Gracefully handle missing Ably configuration
        if (!ablyClient) {
          console.warn('[useAblyPresenceBroadcast] Ably not configured - presence broadcasting disabled');
          return;
        }

        // Get presence channel for current user
        const channelName = AblyChannels.userPresence(currentUserId);
        channel = ablyClient.channels.get(channelName);

        // Enter presence (broadcast as online)
        await channel.presence.enter({
          status: 'online',
          timestamp: Date.now(),
        });

        console.log('[useAblyPresenceBroadcast] Broadcasting presence for user:', currentUserId);
      } catch (error) {
        console.error('[useAblyPresenceBroadcast] Failed to broadcast presence:', error);
      }
    };

    initializePresence();

    // Cleanup - leave presence when component unmounts
    return () => {
      if (channel) {
        channel.presence.leave();
        channel.detach();
      }
      if (ablyClient) {
        ablyClient.close();
      }
    };
  }, [currentUserId, enabled]);
}
