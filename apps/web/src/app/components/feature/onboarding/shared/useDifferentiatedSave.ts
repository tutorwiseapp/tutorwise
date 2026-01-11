/**
 * Filename: useDifferentiatedSave.ts
 * Purpose: Different save strategies for different user actions in onboarding
 * Created: 2026-01-10
 *
 * Save Strategy Matrix:
 * ┌─────────────────────┬──────────────┬─────────────────┬─────────────────────┐
 * │ User Action         │ Blocking?    │ Error Handling  │ User Feedback       │
 * ├─────────────────────┼──────────────┼─────────────────┼─────────────────────┤
 * │ Navigate (Next/Back)│ NO           │ Silent (logs)   │ Optimistic nav      │
 * │ Auto-save (debounce)│ NO           │ Toast error     │ Toast success       │
 * │ Manual Continue     │ YES          │ Show modal      │ Validate + show     │
 * │ Document Upload     │ YES          │ Retry + show    │ Progress indicator  │
 * └─────────────────────┴──────────────┴─────────────────┴─────────────────────┘
 *
 * This hook provides different save functions for different contexts
 */

'use client';

import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

interface SaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDifferentiatedSave<T>() {
  const pendingSaveRef = useRef<Promise<void> | null>(null);

  /**
   * Navigation Save - Optimistic, non-blocking
   * User navigates to next/previous step
   * - NO blocking
   * - Silent failure (logs only)
   * - Navigation happens immediately
   */
  const saveOnNavigate = useCallback(
    ({ data, onSave, onSuccess }: SaveOptions<T>) => {
      // Don't wait for save - navigate immediately
      pendingSaveRef.current = onSave(data)
        .then(() => {
          onSuccess?.();
          console.log('[Navigation Save] Success - data saved in background');
        })
        .catch((error) => {
          // Silent failure - just log it
          console.error('[Navigation Save] Failed (silent):', error);
          // Could optionally queue for retry later
        });

      // Return immediately - don't block navigation
    },
    []
  );

  /**
   * Auto-Save - Non-blocking with user feedback
   * Triggered by debounce after user stops typing
   * - NO blocking
   * - Toast notification on error
   * - Toast notification on success
   */
  const saveOnAutoSave = useCallback(
    ({ data, onSave, onSuccess, onError }: SaveOptions<T>) => {
      onSave(data)
        .then(() => {
          onSuccess?.();
          toast.success('Progress saved', {
            duration: 2000,
            position: 'bottom-right',
            icon: '✓',
          });
        })
        .catch((error) => {
          onError?.(error);
          toast.error(error.message || 'Failed to save progress', {
            duration: 4000,
            position: 'bottom-right',
            icon: '⚠',
          });
          console.error('[Auto-save] Failed:', error);
        });
    },
    []
  );

  /**
   * Manual Save - Blocking with validation
   * User explicitly clicks "Continue" or "Submit"
   * - YES blocking (show loading state)
   * - Show error modal/message
   * - Validate before saving
   */
  const saveOnContinue = useCallback(
    async ({ data, onSave, onSuccess, onError }: SaveOptions<T>): Promise<boolean> => {
      try {
        await onSave(data);
        onSuccess?.();
        return true; // Success - allow navigation
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Save failed');
        onError?.(err);
        // Error shown by caller (modal or inline)
        console.error('[Manual Save] Failed:', err);
        return false; // Block navigation
      }
    },
    []
  );

  /**
   * Check if there's a pending navigation save
   * Call this before unmounting or final submit
   */
  const waitForPendingSave = useCallback(async () => {
    if (pendingSaveRef.current) {
      try {
        await pendingSaveRef.current;
      } catch (error) {
        console.warn('[Pending Save] Failed during cleanup:', error);
      } finally {
        pendingSaveRef.current = null;
      }
    }
  }, []);

  return {
    saveOnNavigate,
    saveOnAutoSave,
    saveOnContinue,
    waitForPendingSave,
  };
}

/**
 * USAGE EXAMPLES:
 *
 * // 1. In Step Component
 * const { saveOnNavigate, saveOnAutoSave, saveOnContinue } = useDifferentiatedSave();
 *
 * // When user clicks "Next" or "Back" (optimistic, non-blocking)
 * const handleNext = () => {
 *   saveOnNavigate({
 *     data: formData,
 *     onSave: async (data) => await updateProfile(data),
 *   });
 *   // Navigate immediately - don't wait for save
 *   onNext(formData);
 * };
 *
 * // Auto-save after typing stops (non-blocking with feedback)
 * useEffect(() => {
 *   const timer = setTimeout(() => {
 *     saveOnAutoSave({
 *       data: formData,
 *       onSave: async (data) => await updateProfile(data),
 *     });
 *   }, 5000);
 *   return () => clearTimeout(timer);
 * }, [formData]);
 *
 * // Manual "Continue" button (blocking with validation)
 * const handleContinue = async () => {
 *   setIsLoading(true);
 *   const success = await saveOnContinue({
 *     data: formData,
 *     onSave: async (data) => await updateProfile(data),
 *     onError: (error) => setError(error.message),
 *   });
 *   setIsLoading(false);
 *
 *   if (success) {
 *     onNext(formData); // Only navigate if save succeeded
 *   }
 * };
 */
