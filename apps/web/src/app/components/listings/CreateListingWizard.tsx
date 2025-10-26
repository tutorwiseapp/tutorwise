'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { CreateListingInput } from '@tutorwise/shared-types';
import { useAutoSaveDraft, loadDraft, clearDraft } from '@/lib/utils/wizardUtils';
import CreateListings from './wizard-steps/CreateListings';

interface CreateListingWizardProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

export default function CreateListingWizard({
  onSubmit,
  onCancel,
  isSaving = false,
  initialData
}: CreateListingWizardProps) {
  const { profile, user } = useUserProfile();
  const DRAFT_KEY = 'listing_draft';

  const [formData, setFormData] = useState<Partial<CreateListingInput>>(() => {
    // Initialize with defaults and initial data
    const baseData: Partial<CreateListingInput> = {
      currency: 'GBP',
      location_country: 'United Kingdom',
      timezone: 'Europe/London',
      languages: ['English'],
      ...initialData,
    };

    // Pre-populate full_name from profile
    if (!baseData.full_name && profile) {
      baseData.full_name = profile.full_name || '';
    }

    return baseData;
  });

  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Load draft from database on mount
  useEffect(() => {
    async function loadSavedDraft() {
      if (!isDraftLoaded && !initialData) {
        const draft = await loadDraft<CreateListingInput>(user?.id, DRAFT_KEY, initialData);

        if (draft) {
          // Only merge fields from draft that actually have values
          const draftWithValues = Object.fromEntries(
            Object.entries(draft).filter(([_, value]) => value !== undefined && value !== null && value !== '')
          ) as Partial<CreateListingInput>;

          // Pre-fill full_name from profile if not in draft
          const fullName = draftWithValues.full_name || profile?.full_name;
          if (fullName) {
            draftWithValues.full_name = fullName;
          }

          setFormData(prev => ({ ...prev, ...draftWithValues }));
        }
        setIsDraftLoaded(true);
      }
    }
    loadSavedDraft();
  }, [user?.id, initialData, isDraftLoaded, profile]);

  // Auto-save draft every 30 seconds
  const { saveDraft } = useAutoSaveDraft<Partial<CreateListingInput>>(
    user?.id,
    DRAFT_KEY,
    formData,
    (data) => !!(data.title || data.description) // Only save if title or description exists
  );

  const handleSaveDraft = () => {
    saveDraft();
  };

  const handleSubmit = async (data: Partial<CreateListingInput>) => {
    await clearDraft(user?.id, DRAFT_KEY);
    onSubmit(data as CreateListingInput);
  };

  return (
    <CreateListings
      formData={formData}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      onSaveDraft={handleSaveDraft}
      isSaving={isSaving}
    />
  );
}
