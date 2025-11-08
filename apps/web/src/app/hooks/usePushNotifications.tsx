/**
 * Filename: apps/web/src/app/hooks/usePushNotifications.tsx
 * Purpose: Custom React hook for browser push notifications
 * Created: 2025-11-08
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

/**
 * Hook to manage browser push notifications
 * @returns Object with permission state, request function, and send function
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true,
  });
  const [isSupported, setIsSupported] = useState(false);

  // Check if notifications are supported and get initial permission
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const currentPermission = Notification.permission;
    setPermission({
      granted: currentPermission === 'granted',
      denied: currentPermission === 'denied',
      default: currentPermission === 'default',
    });
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('[usePushNotifications] Notifications not supported in this browser');
      return false;
    }

    if (permission.granted) {
      return true;
    }

    if (permission.denied) {
      console.warn('[usePushNotifications] Notification permission previously denied');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      const granted = result === 'granted';

      setPermission({
        granted,
        denied: result === 'denied',
        default: result === 'default',
      });

      return granted;
    } catch (error) {
      console.error('[usePushNotifications] Error requesting permission:', error);
      return false;
    }
  }, [isSupported, permission]);

  // Send a notification
  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions): boolean => {
      if (!isSupported) {
        console.warn('[usePushNotifications] Notifications not supported');
        return false;
      }

      if (!permission.granted) {
        console.warn('[usePushNotifications] Notification permission not granted');
        return false;
      }

      try {
        const notification = new Notification(title, {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          ...options,
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        return true;
      } catch (error) {
        console.error('[usePushNotifications] Error sending notification:', error);
        return false;
      }
    },
    [isSupported, permission.granted]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  };
}

/**
 * Helper function to send a new message notification
 */
export function sendMessageNotification(
  senderName: string,
  messageContent: string,
  sendNotification: (title: string, options?: NotificationOptions) => boolean
) {
  return sendNotification(`New message from ${senderName}`, {
    body: messageContent.length > 100 ? `${messageContent.substring(0, 100)}...` : messageContent,
    tag: `message-${senderName}`,
    requireInteraction: false,
    silent: false,
  });
}
