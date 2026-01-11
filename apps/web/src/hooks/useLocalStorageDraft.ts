/**
 * Filename: useLocalStorageDraft.ts
 * Purpose: Persist draft data to localStorage for offline support
 * Created: 2026-01-10
 *
 * Features:
 * - Auto-save to localStorage every 10 seconds
 * - Load saved drafts on mount
 * - Clear drafts after successful submission
 * - Survives page refresh and browser crashes
 */

import { useEffect, useState, useCallback } from 'react';

interface UseLocalStorageDraftOptions<T> {
  key: string; // Unique key for this draft (e.g., 'onboarding-personal-info-{userId}')
  data: T;
  enabled?: boolean;
}

interface DraftMetadata {
  lastSaved: string; // ISO timestamp
  version: string; // Data version for migration
}

interface StoredDraft<T> {
  data: T;
  metadata: DraftMetadata;
}

export function useLocalStorageDraft<T>({
  key,
  data,
  enabled = true,
}: UseLocalStorageDraftOptions<T>) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState<number | null>(null); // Age in milliseconds

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!enabled) return;

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: StoredDraft<T> = JSON.parse(stored);
        const savedAt = new Date(parsed.metadata.lastSaved);
        const age = Date.now() - savedAt.getTime();

        setHasDraft(true);
        setDraftAge(age);

        console.log(`[LocalStorageDraft] Found draft for key "${key}", age: ${Math.round(age / 1000)}s`);
      }
    } catch (error) {
      console.error('[LocalStorageDraft] Error loading draft:', error);
    }
  }, [key, enabled]);

  // Save draft to localStorage periodically
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      try {
        const draft: StoredDraft<T> = {
          data,
          metadata: {
            lastSaved: new Date().toISOString(),
            version: '1.0',
          },
        };

        localStorage.setItem(key, JSON.stringify(draft));
        setHasDraft(true);
        console.log(`[LocalStorageDraft] Saved draft to localStorage: ${key}`);
      } catch (error) {
        console.error('[LocalStorageDraft] Error saving draft:', error);
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(timer);
  }, [key, data, enabled]);

  // Load draft data
  const loadDraft = useCallback((): T | null => {
    if (!enabled) return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed: StoredDraft<T> = JSON.parse(stored);
      return parsed.data;
    } catch (error) {
      console.error('[LocalStorageDraft] Error loading draft:', error);
      return null;
    }
  }, [key, enabled]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setHasDraft(false);
      setDraftAge(null);
      console.log(`[LocalStorageDraft] Cleared draft: ${key}`);
    } catch (error) {
      console.error('[LocalStorageDraft] Error clearing draft:', error);
    }
  }, [key]);

  return {
    hasDraft,
    draftAge,
    loadDraft,
    clearDraft,
  };
}

/**
 * Format draft age for display
 * Example: "Draft saved 2 minutes ago"
 */
export function formatDraftAge(ageMs: number | null): string {
  if (!ageMs) return '';

  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `Draft saved ${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `Draft saved ${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `Draft saved ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Draft saved just now';
}

/**
 * USAGE EXAMPLE:
 *
 * const { hasDraft, draftAge, loadDraft, clearDraft } = useLocalStorageDraft({
 *   key: `onboarding-personal-info-${userId}`,
 *   data: formData,
 *   enabled: true,
 * });
 *
 * // On mount, ask user if they want to restore draft
 * useEffect(() => {
 *   if (hasDraft) {
 *     const shouldRestore = confirm(formatDraftAge(draftAge) + '. Restore it?');
 *     if (shouldRestore) {
 *       const draft = loadDraft();
 *       if (draft) setFormData(draft);
 *     }
 *   }
 * }, [hasDraft]);
 *
 * // After successful submission
 * const handleSubmit = async () => {
 *   await saveToDatabase(formData);
 *   clearDraft(); // Clear localStorage
 * };
 */
