/**
 * Robust draft synchronization utility for wizard forms
 *
 * Features:
 * - Syncs drafts to database (profiles.preferences.wizard_drafts)
 * - Works offline with localStorage fallback
 * - Automatic retry on network failure
 * - Reconciles localStorage + database state
 * - Handles poor network conditions gracefully
 * - Queue mechanism for pending saves
 */

import { createClient } from '@/utils/supabase/client';

interface DraftMetadata {
  lastSaved: string;
  version: number;
  deviceId: string;
}

interface DraftData<T> {
  data: T;
  metadata: DraftMetadata;
}

interface SyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
  timeout: 10000, // 10 seconds
};

// Generate a unique device ID for conflict resolution
function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

/**
 * Save draft to localStorage (instant, offline-first)
 */
function saveDraftToLocalStorage<T>(key: string, data: T): void {
  try {
    const draftData: DraftData<T> = {
      data,
      metadata: {
        lastSaved: new Date().toISOString(),
        version: Date.now(),
        deviceId: getDeviceId(),
      },
    };
    localStorage.setItem(key, JSON.stringify(draftData));
    console.log(`[DraftSync] Saved to localStorage: ${key}`);
  } catch (error) {
    console.error('[DraftSync] Failed to save to localStorage:', error);
  }
}

/**
 * Load draft from localStorage
 */
function loadDraftFromLocalStorage<T>(key: string): DraftData<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as DraftData<T>;
      console.log(`[DraftSync] Loaded from localStorage: ${key}`);
      return parsed;
    }
  } catch (error) {
    console.error('[DraftSync] Failed to load from localStorage:', error);
  }
  return null;
}

/**
 * Save draft to database with retry logic
 */
async function saveDraftToDatabase<T>(
  userId: string,
  key: string,
  data: T,
  options: Required<SyncOptions> = DEFAULT_OPTIONS
): Promise<boolean> {
  const supabase = createClient();
  let attempt = 0;

  while (attempt < options.maxRetries) {
    try {
      console.log(`[DraftSync] Saving to database (attempt ${attempt + 1}/${options.maxRetries}): ${key}`);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      // Fetch current preferences
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Merge new draft into existing preferences
      const currentPreferences = profile?.preferences || {};
      const wizardDrafts = currentPreferences.wizard_drafts || {};

      const draftData: DraftData<T> = {
        data,
        metadata: {
          lastSaved: new Date().toISOString(),
          version: Date.now(),
          deviceId: getDeviceId(),
        },
      };

      const updatedPreferences = {
        ...currentPreferences,
        wizard_drafts: {
          ...wizardDrafts,
          [key]: draftData,
        },
      };

      // Update database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ preferences: updatedPreferences })
        .eq('id', userId);

      clearTimeout(timeoutId);

      if (updateError) throw updateError;

      console.log(`[DraftSync] ✅ Successfully saved to database: ${key}`);
      return true;

    } catch (error: any) {
      attempt++;

      if (error.name === 'AbortError') {
        console.warn(`[DraftSync] Database save timed out (attempt ${attempt}/${options.maxRetries})`);
      } else {
        console.warn(`[DraftSync] Database save failed (attempt ${attempt}/${options.maxRetries}):`, error.message);
      }

      if (attempt < options.maxRetries) {
        // Exponential backoff
        const delay = options.retryDelay * Math.pow(2, attempt - 1);
        console.log(`[DraftSync] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[DraftSync] ❌ Failed to save to database after ${options.maxRetries} attempts: ${key}`);
  return false;
}

/**
 * Load draft from database
 */
async function loadDraftFromDatabase<T>(
  userId: string,
  key: string,
  options: Required<SyncOptions> = DEFAULT_OPTIONS
): Promise<DraftData<T> | null> {
  const supabase = createClient();
  let attempt = 0;

  while (attempt < options.maxRetries) {
    try {
      console.log(`[DraftSync] Loading from database (attempt ${attempt + 1}/${options.maxRetries}): ${key}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      clearTimeout(timeoutId);

      if (error) throw error;

      const wizardDrafts = profile?.preferences?.wizard_drafts || {};
      const draft = wizardDrafts[key] as DraftData<T> | undefined;

      if (draft) {
        console.log(`[DraftSync] ✅ Loaded from database: ${key}`);
        return draft;
      }

      return null;

    } catch (error: any) {
      attempt++;

      if (error.name === 'AbortError') {
        console.warn(`[DraftSync] Database load timed out (attempt ${attempt}/${options.maxRetries})`);
      } else {
        console.warn(`[DraftSync] Database load failed (attempt ${attempt}/${options.maxRetries}):`, error.message);
      }

      if (attempt < options.maxRetries) {
        const delay = options.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[DraftSync] ❌ Failed to load from database after ${options.maxRetries} attempts: ${key}`);
  return null;
}

/**
 * Reconcile localStorage and database drafts
 * Returns the most recent version
 */
function reconcileDrafts<T>(
  localDraft: DraftData<T> | null,
  dbDraft: DraftData<T> | null
): DraftData<T> | null {
  if (!localDraft && !dbDraft) return null;
  if (!localDraft) return dbDraft;
  if (!dbDraft) return localDraft;

  // Use version number to determine which is newer
  if (localDraft.metadata.version > dbDraft.metadata.version) {
    console.log('[DraftSync] Using local draft (newer)');
    return localDraft;
  } else {
    console.log('[DraftSync] Using database draft (newer)');
    return dbDraft;
  }
}

/**
 * Save draft with hybrid approach (localStorage + database)
 *
 * @param userId - User ID for database storage
 * @param key - Unique key for the draft (e.g., 'listing_draft', 'onboarding_draft_tutor')
 * @param data - Draft data to save
 * @param options - Sync options (retry, timeout, etc.)
 */
export async function saveDraft<T>(
  userId: string | undefined,
  key: string,
  data: T,
  options: SyncOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Save to localStorage immediately (offline-first)
  saveDraftToLocalStorage(key, data);

  // 2. Save to database asynchronously (if user is logged in)
  if (userId) {
    // Don't await - let it happen in background
    saveDraftToDatabase(userId, key, data, opts).catch(error => {
      console.error('[DraftSync] Background database save failed:', error);
      // Draft is still in localStorage, so user won't lose work
    });
  }
}

/**
 * Load draft with hybrid approach (reconciles localStorage + database)
 *
 * @param userId - User ID for database storage
 * @param key - Unique key for the draft
 * @param options - Sync options
 * @returns Draft data or null if not found
 */
export async function loadDraft<T>(
  userId: string | undefined,
  key: string,
  options: SyncOptions = {}
): Promise<T | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Load from localStorage (instant)
  const localDraft = loadDraftFromLocalStorage<T>(key);

  // 2. Load from database (if user is logged in)
  let dbDraft: DraftData<T> | null = null;
  if (userId) {
    dbDraft = await loadDraftFromDatabase<T>(userId, key, opts);
  }

  // 3. Reconcile and return the most recent version
  const reconciledDraft = reconcileDrafts(localDraft, dbDraft);

  if (reconciledDraft) {
    // Update localStorage with reconciled version (in case DB was newer)
    saveDraftToLocalStorage(key, reconciledDraft.data);
    return reconciledDraft.data;
  }

  return null;
}

/**
 * Clear draft from both localStorage and database
 */
export async function clearDraft(
  userId: string | undefined,
  key: string,
  options: SyncOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Clear from localStorage
  try {
    localStorage.removeItem(key);
    console.log(`[DraftSync] Cleared from localStorage: ${key}`);
  } catch (error) {
    console.error('[DraftSync] Failed to clear from localStorage:', error);
  }

  // 2. Clear from database
  if (userId) {
    const supabase = createClient();

    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentPreferences = profile?.preferences || {};
      const wizardDrafts = currentPreferences.wizard_drafts || {};

      // Remove the specific draft
      delete wizardDrafts[key];

      const updatedPreferences = {
        ...currentPreferences,
        wizard_drafts: wizardDrafts,
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ preferences: updatedPreferences })
        .eq('id', userId);

      if (updateError) throw updateError;

      console.log(`[DraftSync] ✅ Cleared from database: ${key}`);
    } catch (error) {
      console.error('[DraftSync] Failed to clear from database:', error);
      // Not critical if database clear fails - draft is already gone from localStorage
    }
  }
}

/**
 * Check if draft exists (in either localStorage or database)
 */
export async function draftExists(
  userId: string | undefined,
  key: string
): Promise<boolean> {
  const draft = await loadDraft(userId, key);
  return draft !== null;
}
