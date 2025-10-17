'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { CreateListingInput } from '@tutorwise/shared-types';
import { useAutoSaveDraft, loadDraft, clearDraft, saveCurrentStep } from '@/lib/utils/wizardUtils';
import WelcomeStep from './wizard-steps/WelcomeStep';
import Step1BasicInfo from './wizard-steps/Step1BasicInfo';
import Step2TeachingDetails from './wizard-steps/Step2TeachingDetails';
import Step3ExpertiseCredentials from './wizard-steps/Step3ExpertiseCredentials';
import Step4PricingAvailability from './wizard-steps/Step4PricingAvailability';
import Step4point5Availability from './wizard-steps/Step4point5Availability';
import Step5LocationMedia from './wizard-steps/Step5LocationMedia';
import styles from '../onboarding/OnboardingWizard.module.css';

type ListingStep = 'welcome' | 'basic' | 'teaching' | 'expertise' | 'pricing' | 'availability' | 'location';

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

  const [currentStep, setCurrentStep] = useState<ListingStep>('welcome');
  const [formData, setFormData] = useState<Partial<CreateListingInput>>({
    currency: 'GBP',
    location_country: 'United Kingdom',
    timezone: 'Europe/London',
    languages: ['English'],
    ...initialData,
  });
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Load draft from database on mount
  useEffect(() => {
    async function loadSavedDraft() {
      if (!isDraftLoaded && !initialData) {
        const draft = await loadDraft<CreateListingInput>(user?.id, DRAFT_KEY, initialData);
        if (draft) {
          setFormData(prev => ({ ...prev, ...draft }));
        }
        setIsDraftLoaded(true);
      }
    }
    loadSavedDraft();
  }, [user?.id, initialData, isDraftLoaded]);

  // Auto-save draft every 30 seconds (using shared utility with database sync)
  const { saveDraft } = useAutoSaveDraft<Partial<CreateListingInput>>(
    user?.id,
    DRAFT_KEY,
    formData,
    (data) => !!(data.title || data.description) // Only save if title or description exists
  );

  // Auto-populate from profile
  useEffect(() => {
    console.log('[CreateListingWizard] Auto-populate check:', {
      hasProfile: !!profile,
      fullName: profile?.full_name,
      hasInitialData: !!initialData,
      isDraftLoaded,
      currentTutorName: formData.tutor_name
    });

    if (profile && !initialData && isDraftLoaded) {
      const updates: Partial<CreateListingInput> = {};

      // Auto-populate tutor_name from profile full_name
      if (profile.full_name && !formData.tutor_name) {
        console.log('[CreateListingWizard] Auto-populating tutor_name:', profile.full_name);
        updates.tutor_name = profile.full_name;
      }

      // Auto-populate first image with profile picture
      const profilePicture = profile.avatar_url;
      if (profilePicture && (!formData.images || formData.images.length === 0)) {
        console.log('[CreateListingWizard] Auto-populating image:', profilePicture);
        updates.images = [profilePicture];
      }

      if (Object.keys(updates).length > 0) {
        console.log('[CreateListingWizard] Applying updates:', updates);
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [profile, formData.tutor_name, formData.images, initialData, isDraftLoaded]);

  // Save current step whenever it changes (for resume functionality)
  useEffect(() => {
    if (isDraftLoaded) {
      saveCurrentStep(user?.id, DRAFT_KEY, currentStep);
    }
  }, [user?.id, currentStep, isDraftLoaded]);

  const updateFormData = (stepData: Partial<CreateListingInput>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
  };

  // Step navigation handlers
  const handleWelcomeNext = () => {
    setCurrentStep('basic');
  };

  const handleBasicNext = (data: Partial<CreateListingInput>) => {
    updateFormData(data);
    setCurrentStep('teaching');
  };

  const handleTeachingNext = (data: Partial<CreateListingInput>) => {
    updateFormData(data);
    setCurrentStep('expertise');
  };

  const handleExpertiseNext = (data: Partial<CreateListingInput>) => {
    updateFormData(data);
    setCurrentStep('pricing');
  };

  const handlePricingNext = (data: Partial<CreateListingInput>) => {
    updateFormData(data);
    setCurrentStep('availability');
  };

  const handleAvailabilityNext = (data: Partial<CreateListingInput>) => {
    updateFormData(data);
    setCurrentStep('location');
  };

  const handleBack = () => {
    const stepOrder: ListingStep[] = ['welcome', 'basic', 'teaching', 'expertise', 'pricing', 'availability', 'location'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSaveDraft = () => {
    saveDraft();
    alert('Draft saved! You can resume later from your listings page.');
    onCancel();
  };

  const handleFinalSubmit = async (finalStepData: Partial<CreateListingInput>) => {
    const completeData = { ...formData, ...finalStepData };
    await clearDraft(user?.id, DRAFT_KEY); // Use shared utility to clear draft from DB and localStorage
    onSubmit(completeData as CreateListingInput);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            userName={profile?.full_name || user?.email?.split('@')[0] || 'there'}
            onNext={handleWelcomeNext}
            onSkip={onCancel}
          />
        );
      case 'basic':
        return (
          <Step1BasicInfo
            formData={formData}
            onNext={handleBasicNext}
            onBack={handleBack}
          />
        );
      case 'teaching':
        return (
          <Step2TeachingDetails
            formData={formData}
            onNext={handleTeachingNext}
            onBack={handleBack}
          />
        );
      case 'expertise':
        return (
          <Step3ExpertiseCredentials
            formData={formData}
            onNext={handleExpertiseNext}
            onBack={handleBack}
          />
        );
      case 'pricing':
        return (
          <Step4PricingAvailability
            formData={formData}
            onNext={handlePricingNext}
            onBack={handleBack}
          />
        );
      case 'availability':
        return (
          <Step4point5Availability
            formData={formData}
            onNext={handleAvailabilityNext}
            onBack={handleBack}
          />
        );
      case 'location':
        return (
          <Step5LocationMedia
            formData={formData}
            onBack={handleBack}
            onSubmit={handleFinalSubmit}
            onSaveDraft={handleSaveDraft}
            isSaving={isSaving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.wizardContainer + ' ' + styles.fullPage}>
      {/* Progress indicator */}
      <div className={styles.wizardProgress}>
        {['welcome', 'basic', 'teaching', 'expertise', 'pricing', 'availability', 'location'].map((step, index) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`${styles.progressDot} ${
                currentStep === step ? styles.active :
                ['welcome', 'basic', 'teaching', 'expertise', 'pricing', 'availability', 'location'].indexOf(currentStep) > index ? styles.completed : ''
              }`}
            />
            {index < 6 && <div className={`${styles.progressSeparator} ${
              ['welcome', 'basic', 'teaching', 'expertise', 'pricing', 'availability', 'location'].indexOf(currentStep) > index ? styles.active : ''
            }`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {renderStep()}
    </div>
  );
}
