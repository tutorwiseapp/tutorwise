/**
 * Filename: apps/web/src/lib/review-notifications.ts
 * Purpose: Utility functions for sending review-related Ably notifications
 * Created: 2025-11-08
 * Related: reviews-solution-design-v4.5.md
 */

import { getAblyServerClient, AblyChannels } from './ably';

export interface ReviewNotificationPayload {
  type: 'session_created' | 'session_published' | 'review_received';
  session_id: string;
  booking_id: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Send a notification to a user about a review event via Ably
 */
export async function sendReviewNotification(
  userId: string,
  payload: ReviewNotificationPayload
): Promise<void> {
  try {
    const ably = getAblyServerClient();
    const channelName = AblyChannels.reviewNotifications(userId);
    const channel = ably.channels.get(channelName);

    await channel.publish('review-notification', {
      ...payload,
      timestamp: Date.now(),
    });

    console.log('[ReviewNotifications] Sent notification:', { userId, type: payload.type });
  } catch (error) {
    console.error('[ReviewNotifications] Failed to send notification:', error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Send notifications to all participants in a review session
 */
export async function notifySessionCreated(
  participantIds: string[],
  sessionId: string,
  bookingId: string,
  serviceName: string
): Promise<void> {
  const notifications = participantIds.map((userId) =>
    sendReviewNotification(userId, {
      type: 'session_created',
      session_id: sessionId,
      booking_id: bookingId,
      message: `Time to review your experience with ${serviceName}`,
      metadata: {
        service_name: serviceName,
      },
    })
  );

  await Promise.allSettled(notifications);
}

/**
 * Send notifications to all participants when a review session is published
 */
export async function notifySessionPublished(
  participantIds: string[],
  sessionId: string,
  bookingId: string,
  serviceName: string
): Promise<void> {
  const notifications = participantIds.map((userId) =>
    sendReviewNotification(userId, {
      type: 'session_published',
      session_id: sessionId,
      booking_id: bookingId,
      message: `Reviews for ${serviceName} are now published`,
      metadata: {
        service_name: serviceName,
      },
    })
  );

  await Promise.allSettled(notifications);
}
