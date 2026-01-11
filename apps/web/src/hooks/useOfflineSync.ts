/**
 * Hook to automatically sync offline queue when connection is restored
 */

import { useEffect } from 'react';
import { processOfflineQueue } from '@/lib/offlineQueue';
import { saveOnboardingProgress } from '@/lib/api/onboarding';

export function useOfflineSync(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const handleOnline = async () => {
      console.log('[OfflineSync] Connection restored - processing queue...');

      try {
        await processOfflineQueue(async (stepName, data) => {
          await saveOnboardingProgress({
            userId,
            progress: {
              tutor: {
                [stepName]: data
              }
            }
          });
        });

        console.log('[OfflineSync] ✓ Queue synced successfully');
      } catch (error) {
        console.error('[OfflineSync] Queue sync failed:', error);
      }
    };

    // Process queue on mount (in case there are pending items)
    if (navigator.onLine) {
      handleOnline();
    }

    // Listen for online event
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [userId]);
}
