/**
 * Shared wizard utilities for listing creation and onboarding flows
 * Promotes code reuse and consistency across all wizard-based UIs
 *
 * Features:
 * - Database-backed auto-save with localStorage fallback
 * - Works offline with automatic sync when online
 * - Handles poor network conditions with retry logic
 * - Reconciles state across devices
 */

import React, { useCallback, useEffect } from 'react';
import { saveDraft as saveDraftToDb, loadDraft as loadDraftFromDb, clearDraft as clearDraftFromDb } from './draftSync';

/**
 * Auto-save draft with database sync every 30 seconds
 * Works offline with localStorage, syncs to database when online
 *
 * @param userId - Current user ID (undefined if not logged in)
 * @param draftKey - Unique key for the draft (e.g., 'listing_draft', 'onboarding_draft_tutor')
 * @param formData - Current form data to save
 * @param shouldSave - Function to determine if draft should be saved (e.g., check if title/description exists)
 */
export function useAutoSaveDraft<T>(
  userId: string | undefined,
  draftKey: string,
  formData: T,
  shouldSave: (data: T) => boolean = () => true
) {
  const saveDraft = useCallback(async () => {
    if (shouldSave(formData)) {
      await saveDraftToDb(userId, draftKey, formData);
    }
  }, [userId, draftKey, formData, shouldSave]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(saveDraft, 30000); // 30 seconds
    return () => clearInterval(timer);
  }, [saveDraft]);

  return { saveDraft };
}

/**
 * Load draft with database sync (reconciles localStorage + database)
 * Async version - use in useEffect or initialization
 *
 * @param userId - Current user ID
 * @param draftKey - Unique key for the draft
 * @param initialData - Initial data to merge with draft (optional, takes precedence over draft)
 * @returns Promise of draft data or null if not found
 */
export async function loadDraft<T>(
  userId: string | undefined,
  draftKey: string,
  initialData?: Partial<T>
): Promise<Partial<T> | null> {
  // Don't load draft if initialData is provided (e.g., editing existing item)
  if (initialData && Object.keys(initialData).length > 0) {
    console.log(`[WizardUtils] Skipping draft load, using initialData`);
    return null;
  }

  return await loadDraftFromDb<Partial<T>>(userId, draftKey);
}

/**
 * Clear draft from both localStorage and database
 *
 * @param userId - Current user ID
 * @param draftKey - Unique key for the draft
 */
export async function clearDraft(userId: string | undefined, draftKey: string): Promise<void> {
  await clearDraftFromDb(userId, draftKey);
}

/**
 * Save current step (stored in same draft object, but also separately for quick access)
 *
 * @param userId - Current user ID
 * @param draftKey - Unique key for the draft
 * @param currentStep - Current step identifier
 */
export async function saveCurrentStep(
  userId: string | undefined,
  draftKey: string,
  currentStep: string
): Promise<void> {
  await saveDraftToDb(userId, `${draftKey}_step`, { step: currentStep });
}

/**
 * Load saved step
 *
 * @param userId - Current user ID
 * @param draftKey - Unique key for the draft
 * @returns Saved step or null if not found
 */
export async function loadSavedStep(
  userId: string | undefined,
  draftKey: string
): Promise<string | null> {
  const data = await loadDraftFromDb<{ step: string }>(userId, `${draftKey}_step`);
  return data?.step || null;
}

/**
 * Clear saved step
 *
 * @param userId - Current user ID
 * @param draftKey - Unique key for the draft
 */
export async function clearSavedStep(
  userId: string | undefined,
  draftKey: string
): Promise<void> {
  await clearDraftFromDb(userId, `${draftKey}_step`);
}

/**
 * Hook for managing wizard step state with database persistence
 * Automatically saves current step and can resume from saved step
 *
 * @param userId - Current user ID
 * @param draftKey - Unique key for the draft
 * @param initialStep - Initial step to start from
 * @param urlStep - Step from URL parameter (takes precedence over saved step)
 * @returns Current step and setter function
 */
export function useWizardStep<TStep extends string>(
  userId: string | undefined,
  draftKey: string,
  initialStep: TStep,
  urlStep?: string | null
): [TStep, (step: TStep) => void] {
  const [currentStep, setCurrentStepInternal] = React.useState<TStep>(initialStep);
  const [_isInitialized, setIsInitialized] = React.useState(false);

  // Load saved step on mount
  useEffect(() => {
    async function initializeStep() {
      // Priority: URL param > saved step > initial step
      if (urlStep) {
        console.log(`[WizardUtils] Using step from URL: ${urlStep}`);
        setCurrentStepInternal(urlStep as TStep);
      } else {
        const savedStep = await loadSavedStep(userId, draftKey);
        if (savedStep) {
          console.log(`[WizardUtils] Resuming from saved step: ${savedStep}`);
          setCurrentStepInternal(savedStep as TStep);
        } else {
          console.log(`[WizardUtils] Starting from initial step: ${initialStep}`);
        }
      }
      setIsInitialized(true);
    }

    initializeStep();
  }, [userId, draftKey, initialStep, urlStep]);

  // Wrap setter to also save to database
  const setCurrentStep = useCallback(
    (step: TStep) => {
      setCurrentStepInternal(step);
      saveCurrentStep(userId, draftKey, step); // Async, fire-and-forget
    },
    [userId, draftKey]
  );

  return [currentStep, setCurrentStep];
}
