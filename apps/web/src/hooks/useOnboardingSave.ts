/**
 * Unified save infrastructure for onboarding steps
 * Provides multi-layer save protection with offline support
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { saveOnboardingProgress } from '@/lib/api/onboarding';
import { addToOfflineQueue, clearFromOfflineQueue } from '@/lib/offlineQueue';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveStrategy {
  type: 'auto' | 'blur' | 'navigation' | 'manual';
  debounce?: number;
  optimistic?: boolean;
  retry?: number;
}

export interface SaveOptions {
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface SaveResult {
  success: boolean;
  error?: Error;
}

/**
 * Unified save hook for onboarding steps
 * Handles auto-save, blur-save, navigation-save with retry and offline support
 */
export function useOnboardingSave<T>(
  stepName: string,
  formData: T,
  userId: string | undefined,
  options: SaveOptions = {}
) {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const lastSavedDataRef = useRef<T>(formData);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(lastSavedDataRef.current);
    setHasUnsavedChanges(hasChanges);
  }, [formData]);

  /**
   * Core save function with retry logic
   */
  const save = useCallback(async (
    data: T,
    strategy: SaveStrategy = { type: 'manual', retry: 3 }
  ): Promise<SaveResult> => {
    if (!userId) {
      console.warn('[useOnboardingSave] No userId, skipping save');
      return { success: false, error: new Error('Not authenticated') };
    }

    setSaveState('saving');

    try {
      // 1. Add to offline queue first (resilience layer)
      await addToOfflineQueue(stepName, data);

      // 2. Attempt server save
      await saveOnboardingProgress({
        userId,
        progress: {
          tutor: {
            [stepName]: data
          }
        }
      });

      // 3. Clear from offline queue on success
      await clearFromOfflineQueue(stepName);

      // 4. Update state
      setSaveState('saved');
      setRetryCount(0);
      setHasUnsavedChanges(false);
      lastSavedDataRef.current = data;

      // Auto-reset to idle after 2 seconds
      setTimeout(() => setSaveState('idle'), 2000);

      options.onSuccess?.();

      console.log(`[useOnboardingSave] ✓ Saved ${stepName}`, { strategy: strategy.type });
      return { success: true };

    } catch (error) {
      console.error(`[useOnboardingSave] ❌ Save failed for ${stepName}:`, error);

      // Keep in offline queue for retry
      setSaveState('error');

      const maxRetries = strategy.retry ?? 3;

      if (retryCount < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = 2000 * Math.pow(2, retryCount);
        console.log(`[useOnboardingSave] Retry ${retryCount + 1}/${maxRetries} in ${delay}ms`);

        setRetryCount(prev => prev + 1);

        setTimeout(() => {
          save(data, strategy);
        }, delay);
      } else {
        console.error(`[useOnboardingSave] Max retries reached for ${stepName}`);
        options.onError?.(error as Error);
      }

      return { success: false, error: error as Error };
    }
  }, [userId, stepName, retryCount, options]);

  /**
   * Debounced save for auto-save scenarios
   */
  const debouncedSave = useCallback((
    data: T,
    debounce: number = 3000
  ) => {
    if (!options.enabled) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      save(data, { type: 'auto', retry: 3 });
    }, debounce);
  }, [save, options.enabled]);

  /**
   * Immediate save (no debounce)
   */
  const immediateSave = useCallback((data: T, strategy?: SaveStrategy) => {
    return save(data, strategy || { type: 'manual', retry: 3 });
  }, [save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveState,
    retryCount,
    hasUnsavedChanges,
    save: immediateSave,
    debouncedSave,
  };
}
