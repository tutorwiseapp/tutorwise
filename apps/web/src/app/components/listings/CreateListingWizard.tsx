'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { CreateListingInput } from '@tutorwise/shared-types';
import WelcomeStep from './wizard-steps/WelcomeStep';
import Step1BasicInfo from './wizard-steps/Step1BasicInfo';
import Step2TeachingDetails from './wizard-steps/Step2TeachingDetails';
import Step3ExpertiseCredentials from './wizard-steps/Step3ExpertiseCredentials';
import Step4PricingAvailability from './wizard-steps/Step4PricingAvailability';
import Step5LocationMedia from './wizard-steps/Step5LocationMedia';
import styles from '../onboarding/OnboardingWizard.module.css';

type ListingStep = 'welcome' | 'basic' | 'teaching' | 'expertise' | 'pricing' | 'location';

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
  const [currentStep, setCurrentStep] = useState<ListingStep>('welcome');
  const [formData, setFormData] = useState<Partial<CreateListingInput>>({
    currency: 'GBP',
    location_country: 'United Kingdom',
    timezone: 'Europe/London',
    languages: ['English'],
    ...initialData,
  });

  // Auto-save draft to localStorage
  const saveDraft = useCallback(() => {
    if (formData.title || formData.description) {
      localStorage.setItem('listing_draft', JSON.stringify(formData));
      console.log('Draft saved');
    }
  }, [formData]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(saveDraft, 30000);
    return () => clearInterval(timer);
  }, [saveDraft]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('listing_draft');
    if (draft && !initialData) {
      try {
        const parsedDraft = JSON.parse(draft);
        setFormData(prev => ({ ...prev, ...parsedDraft }));
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, [initialData]);

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
    setCurrentStep('location');
  };

  const handleBack = () => {
    const stepOrder: ListingStep[] = ['welcome', 'basic', 'teaching', 'expertise', 'pricing', 'location'];
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

  const handleFinalSubmit = (finalStepData: Partial<CreateListingInput>) => {
    const completeData = { ...formData, ...finalStepData };
    localStorage.removeItem('listing_draft');
    onSubmit(completeData as CreateListingInput);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            userName={profile?.display_name || user?.email?.split('@')[0] || 'there'}
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
        {['welcome', 'basic', 'teaching', 'expertise', 'pricing', 'location'].map((step, index) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`${styles.progressDot} ${
                currentStep === step ? styles.active :
                ['welcome', 'basic', 'teaching', 'expertise', 'pricing', 'location'].indexOf(currentStep) > index ? styles.completed : ''
              }`}
            />
            {index < 5 && <div className={`${styles.progressSeparator} ${
              ['welcome', 'basic', 'teaching', 'expertise', 'pricing', 'location'].indexOf(currentStep) > index ? styles.active : ''
            }`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {renderStep()}
    </div>
  );
}
