/**
 * Offline queue for onboarding data
 * Uses IndexedDB for persistent storage when network is unavailable
 */

import Dexie, { Table } from 'dexie';

interface QueuedSave {
  id?: number;
  stepName: string;
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'failed';
}

class OfflineDatabase extends Dexie {
  queue!: Table<QueuedSave>;

  constructor() {
    super('OnboardingOfflineDB');
    this.version(1).stores({
      queue: '++id, stepName, timestamp, status'
    });
  }
}

const db = new OfflineDatabase();

/**
 * Add data to offline queue
 */
export async function addToOfflineQueue(stepName: string, data: any): Promise<void> {
  try {
    // Check if entry already exists for this step
    const existing = await db.queue.where('stepName').equals(stepName).first();

    if (existing) {
      // Update existing entry
      await db.queue.update(existing.id!, {
        data,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending'
      });
    } else {
      // Add new entry
      await db.queue.add({
        stepName,
        data,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending'
      });
    }

    console.log('[OfflineQueue] ✓ Added to queue:', stepName);
  } catch (error) {
    console.error('[OfflineQueue] Failed to add to queue:', error);
    // Fail silently - this is a resilience layer
  }
}

/**
 * Clear data from offline queue (after successful save)
 */
export async function clearFromOfflineQueue(stepName: string): Promise<void> {
  try {
    const deleted = await db.queue.where('stepName').equals(stepName).delete();
    if (deleted > 0) {
      console.log('[OfflineQueue] ✓ Cleared from queue:', stepName);
    }
  } catch (error) {
    console.error('[OfflineQueue] Failed to clear from queue:', error);
  }
}

/**
 * Process all pending items in the offline queue
 * Called when connection is restored
 */
export async function processOfflineQueue(
  saveFunction: (stepName: string, data: any) => Promise<void>
): Promise<void> {
  try {
    const pending = await db.queue.where('status').equals('pending').toArray();

    if (pending.length === 0) {
      return;
    }

    console.log(`[OfflineQueue] Processing ${pending.length} pending items...`);

    for (const item of pending) {
      try {
        await saveFunction(item.stepName, item.data);

        // Success - remove from queue
        await db.queue.delete(item.id!);
        console.log(`[OfflineQueue] ✓ Synced: ${item.stepName}`);
      } catch (error) {
        console.error(`[OfflineQueue] Failed to sync: ${item.stepName}`, error);

        // Increment retry count
        const newRetries = item.retries + 1;

        if (newRetries >= 3) {
          // Mark as failed after 3 retries
          await db.queue.update(item.id!, {
            retries: newRetries,
            status: 'failed'
          });
          console.error(`[OfflineQueue] ❌ Max retries for: ${item.stepName}`);
        } else {
          // Update retry count
          await db.queue.update(item.id!, {
            retries: newRetries
          });
        }
      }
    }

    console.log('[OfflineQueue] ✓ Queue processing complete');
  } catch (error) {
    console.error('[OfflineQueue] Queue processing failed:', error);
  }
}

/**
 * Get all failed queue items (for debugging/monitoring)
 */
export async function getFailedQueueItems(): Promise<QueuedSave[]> {
  try {
    return await db.queue.where('status').equals('failed').toArray();
  } catch (error) {
    console.error('[OfflineQueue] Failed to get failed items:', error);
    return [];
  }
}

/**
 * Clear all queue items (use with caution)
 */
export async function clearAllQueue(): Promise<void> {
  try {
    await db.queue.clear();
    console.log('[OfflineQueue] ✓ Cleared all queue items');
  } catch (error) {
    console.error('[OfflineQueue] Failed to clear queue:', error);
  }
}

/**
 * Check if there are unsaved changes in the queue
 */
export async function hasUnsavedChanges(): Promise<boolean> {
  try {
    const count = await db.queue.where('status').equals('pending').count();
    return count > 0;
  } catch (error) {
    console.error('[OfflineQueue] Failed to check unsaved changes:', error);
    return false;
  }
}
