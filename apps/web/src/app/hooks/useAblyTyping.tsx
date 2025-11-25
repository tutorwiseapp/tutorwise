/**
 * Filename: apps/web/src/app/hooks/useAblyTyping.tsx
 * Purpose: Custom React hook for Ably typing indicators
 * Created: 2025-11-08
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAblyClientClient } from '@/lib/ably';
import type * as Ably from 'ably';

const TYPING_TIMEOUT = 3000; // 3 seconds
const TYPING_DEBOUNCE = 500; // 500ms debounce for sending typing events

/**
 * Hook to manage typing indicators for a conversation
 * @param channelName - The Ably channel name for the conversation
 * @param currentUserId - The current user's ID
 * @param currentUserName - The current user's name
 * @returns Object with isOtherUserTyping state and startTyping function
 */
export function useAblyTyping(
  channelName: string | null,
  currentUserId: string,
  currentUserName: string
) {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const ablyClientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sendTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Initialize Ably channel and subscribe to typing events
  useEffect(() => {
    if (!channelName) {
      setIsOtherUserTyping(false);
      return;
    }

    let mounted = true;

    const initializeTyping = async () => {
      try {
        // Initialize Ably client
        ablyClientRef.current = getAblyClientClient(currentUserId);

        // Gracefully handle missing Ably configuration
        if (!ablyClientRef.current) {
          console.warn('[useAblyTyping] Ably not configured - typing indicators disabled');
          return;
        }

        // Get typing channel (append :typing to conversation channel)
        const typingChannelName = `${channelName}:typing`;
        channelRef.current = ablyClientRef.current.channels.get(typingChannelName);

        // Subscribe to typing events
        channelRef.current.subscribe('typing', (message) => {
          if (mounted && message.data?.userId !== currentUserId) {
            if (message.data?.isTyping) {
              setIsOtherUserTyping(true);

              // Clear existing timeout
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }

              // Set timeout to clear typing indicator
              typingTimeoutRef.current = setTimeout(() => {
                if (mounted) {
                  setIsOtherUserTyping(false);
                }
              }, TYPING_TIMEOUT);
            } else {
              setIsOtherUserTyping(false);
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
            }
          }
        });
      } catch (error) {
        console.error('[useAblyTyping] Failed to initialize typing:', error);
      }
    };

    initializeTyping();

    // Cleanup
    return () => {
      mounted = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (sendTypingTimeoutRef.current) {
        clearTimeout(sendTypingTimeoutRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current.detach();
      }
      if (ablyClientRef.current) {
        ablyClientRef.current.close();
      }
    };
  }, [channelName, currentUserId]);

  // Function to send typing event (debounced)
  const startTyping = useCallback(() => {
    if (!channelRef.current) return;

    const now = Date.now();
    const timeSinceLastSent = now - lastTypingSentRef.current;

    // Only send if enough time has passed (debounce)
    if (timeSinceLastSent >= TYPING_DEBOUNCE) {
      channelRef.current.publish('typing', {
        userId: currentUserId,
        userName: currentUserName,
        isTyping: true,
        timestamp: now,
      });
      lastTypingSentRef.current = now;

      // Clear existing timeout
      if (sendTypingTimeoutRef.current) {
        clearTimeout(sendTypingTimeoutRef.current);
      }

      // Auto-send "stopped typing" after timeout
      sendTypingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.publish('typing', {
            userId: currentUserId,
            userName: currentUserName,
            isTyping: false,
            timestamp: Date.now(),
          });
        }
      }, TYPING_TIMEOUT);
    }
  }, [currentUserId, currentUserName]);

  // Function to explicitly stop typing
  const stopTyping = useCallback(() => {
    if (!channelRef.current) return;

    if (sendTypingTimeoutRef.current) {
      clearTimeout(sendTypingTimeoutRef.current);
    }

    channelRef.current.publish('typing', {
      userId: currentUserId,
      userName: currentUserName,
      isTyping: false,
      timestamp: Date.now(),
    });

    lastTypingSentRef.current = 0;
  }, [currentUserId, currentUserName]);

  return {
    isOtherUserTyping,
    startTyping,
    stopTyping,
  };
}
