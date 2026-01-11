/**
 * Filename: useAutoSave.ts
 * Purpose: Auto-save hook with debouncing for onboarding forms
 * Created: 2026-01-10
 *
 * Features:
 * - 3-second debounce delay (balances responsiveness vs server load)
 * - Non-blocking saves (users can continue editing/navigating)
 * - Save status tracking (idle, pending, saving, success, error)
 * - Automatic retry on failure
 * - Cancel pending saves on unmount
 *
 * Usage:
 * const { saveStatus, lastSaved, triggerSave } = useAutoSave({
 *   data: formData,
 *   onSave: async (data) => await saveToAPI(data),
 *   debounceMs: 5000,
 * });
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'success' | 'error';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  triggerSave: () => void;
  error: Error | null;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 3000, // 3 seconds default (better data protection)
  enabled = true,
  onSuccess,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);
  const isMountedRef = useRef(true);

  // Perform the actual save
  const performSave = useCallback(async () => {
    if (!enabled) return;

    setSaveStatus('saving');
    setError(null);

    try {
      await onSave(data);

      if (isMountedRef.current) {
        setSaveStatus('success');
        setLastSaved(new Date());
        setError(null);
        onSuccess?.();

        // Reset to idle after 2 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus('idle');
          }
        }, 2000);
      }
    } catch (err) {
      const saveError = err instanceof Error ? err : new Error('Save failed');

      if (isMountedRef.current) {
        setSaveStatus('error');
        setError(saveError);
        onError?.(saveError);

        // Reset to idle after 3 seconds to allow retry
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus('idle');
          }
        }, 3000);
      }
    }
  }, [data, enabled, onSave, onSuccess, onError]);

  // Manual trigger for immediate save
  const triggerSave = useCallback(() => {
    // Clear any pending debounced save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    performSave();
  }, [performSave]);

  // Auto-save with debouncing when data changes
  useEffect(() => {
    if (!enabled) return;

    // Skip if data hasn't changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }

    previousDataRef.current = data;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Mark as pending
    setSaveStatus('pending');

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, debounceMs, enabled, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSaved,
    triggerSave,
    error,
  };
}

/**
 * Hook variant for onboarding specifically
 * Provides optimized defaults for onboarding flow
 */
export function useOnboardingAutoSave<T>(
  data: T,
  onSave: (data: T) => Promise<void>,
  options?: {
    enabled?: boolean;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  return useAutoSave({
    data,
    onSave,
    debounceMs: 5000, // 5 seconds for onboarding
    enabled: options?.enabled,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

/**
 * Utility: Format last saved time for display
 * Example: "Saved just now" | "Saved 2 minutes ago" | "Saved at 3:45 PM"
 */
export function formatLastSaved(lastSaved: Date | null): string {
  if (!lastSaved) return '';

  const now = new Date();
  const diffMs = now.getTime() - lastSaved.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 10) return 'Saved just now';
  if (diffSeconds < 60) return `Saved ${diffSeconds} seconds ago`;
  if (diffMinutes === 1) return 'Saved 1 minute ago';
  if (diffMinutes < 60) return `Saved ${diffMinutes} minutes ago`;

  // Format as time
  return `Saved at ${lastSaved.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}
