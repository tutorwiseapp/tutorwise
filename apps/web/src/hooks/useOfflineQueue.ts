/**
 * Filename: useOfflineQueue.ts
 * Purpose: Queue failed saves and retry when online
 * Created: 2026-01-10
 *
 * Features:
 * - Detect online/offline status
 * - Queue failed saves to localStorage
 * - Auto-retry queued saves when connection restored
 * - Prevent data loss during network issues
 */

import { useEffect, useState, useCallback } from 'react';

interface QueuedSave<T> {
  id: string;
  data: T;
  timestamp: string;
  retryCount: number;
}

interface UseOfflineQueueOptions<T> {
  queueKey: string; // Unique key for this queue (e.g., 'save-queue-{userId}')
  onRetry: (data: T) => Promise<void>; // Function to retry the save
  maxRetries?: number;
}

export function useOfflineQueue<T>({
  queueKey,
  onRetry,
  maxRetries = 3,
}: UseOfflineQueueOptions<T>) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queueLength, setQueueLength] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineQueue] Connection restored');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[OfflineQueue] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queue length on mount
  useEffect(() => {
    updateQueueLength();
  }, [queueKey]);

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline && queueLength > 0 && !isProcessing) {
      processQueue();
    }
  }, [isOnline, queueLength]);

  const updateQueueLength = () => {
    try {
      const stored = localStorage.getItem(queueKey);
      if (stored) {
        const queue: QueuedSave<T>[] = JSON.parse(stored);
        setQueueLength(queue.length);
      } else {
        setQueueLength(0);
      }
    } catch (error) {
      console.error('[OfflineQueue] Error reading queue:', error);
      setQueueLength(0);
    }
  };

  // Add failed save to queue
  const enqueue = useCallback((data: T) => {
    try {
      const stored = localStorage.getItem(queueKey);
      const queue: QueuedSave<T>[] = stored ? JSON.parse(stored) : [];

      const newItem: QueuedSave<T> = {
        id: Date.now().toString(),
        data,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      queue.push(newItem);
      localStorage.setItem(queueKey, JSON.stringify(queue));

      setQueueLength(queue.length);
      console.log(`[OfflineQueue] Queued save (${queue.length} items in queue)`);
    } catch (error) {
      console.error('[OfflineQueue] Error enqueueing save:', error);
    }
  }, [queueKey]);

  // Process queued saves
  const processQueue = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    console.log('[OfflineQueue] Processing queue...');

    try {
      const stored = localStorage.getItem(queueKey);
      if (!stored) {
        setIsProcessing(false);
        return;
      }

      const queue: QueuedSave<T>[] = JSON.parse(stored);
      const remainingQueue: QueuedSave<T>[] = [];

      for (const item of queue) {
        try {
          await onRetry(item.data);
          console.log(`[OfflineQueue] Successfully retried save: ${item.id}`);
          // Don't add to remainingQueue - it succeeded
        } catch (error) {
          console.error(`[OfflineQueue] Failed to retry save: ${item.id}`, error);

          if (item.retryCount < maxRetries) {
            // Retry again later
            remainingQueue.push({
              ...item,
              retryCount: item.retryCount + 1,
            });
          } else {
            console.error(`[OfflineQueue] Max retries reached for ${item.id}, discarding`);
          }
        }
      }

      // Update queue with remaining items
      if (remainingQueue.length > 0) {
        localStorage.setItem(queueKey, JSON.stringify(remainingQueue));
      } else {
        localStorage.removeItem(queueKey);
      }

      setQueueLength(remainingQueue.length);
      console.log(`[OfflineQueue] Processing complete. ${remainingQueue.length} items remaining`);
    } catch (error) {
      console.error('[OfflineQueue] Error processing queue:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [queueKey, onRetry, maxRetries, isProcessing]);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    try {
      localStorage.removeItem(queueKey);
      setQueueLength(0);
      console.log('[OfflineQueue] Queue cleared');
    } catch (error) {
      console.error('[OfflineQueue] Error clearing queue:', error);
    }
  }, [queueKey]);

  return {
    isOnline,
    queueLength,
    isProcessing,
    enqueue,
    processQueue,
    clearQueue,
  };
}

/**
 * USAGE EXAMPLE:
 *
 * const { isOnline, queueLength, enqueue } = useOfflineQueue({
 *   queueKey: `save-queue-${userId}`,
 *   onRetry: async (data) => {
 *     await saveOnboardingProgress({ userId, progress: data });
 *   },
 * });
 *
 * // In auto-save hook
 * try {
 *   await saveOnboardingProgress(data);
 * } catch (error) {
 *   if (!navigator.onLine) {
 *     // Offline - queue for later
 *     enqueue(data);
 *     toast.info('Changes saved offline. Will sync when online.');
 *   } else {
 *     // Online but failed - show error
 *     toast.error('Failed to save. Please try again.');
 *   }
 * }
 *
 * // Show queue status in UI
 * {queueLength > 0 && (
 *   <div className="offline-indicator">
 *     {queueLength} changes waiting to sync
 *   </div>
 * )}
 */
