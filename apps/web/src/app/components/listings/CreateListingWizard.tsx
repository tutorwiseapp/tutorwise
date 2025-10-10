'use client';

import { useState, useEffect } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import Step1BasicInfo from './wizard-steps/Step1BasicInfo';
import Step2TeachingDetails from './wizard-steps/Step2TeachingDetails';
import Step3ExpertiseCredentials from './wizard-steps/Step3ExpertiseCredentials';
import Step4PricingAvailability from './wizard-steps/Step4PricingAvailability';
import Step5LocationMedia from './wizard-steps/Step5LocationMedia';

interface CreateListingWizardProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

const STEPS = [
  { id: 1, label: 'Basic Info', shortLabel: 'Basic' },
  { id: 2, label: 'Teaching Details', shortLabel: 'Teaching' },
  { id: 3, label: 'Expertise', shortLabel: 'Expertise' },
  { id: 4, label: 'Pricing & Availability', shortLabel: 'Pricing' },
  { id: 5, label: 'Location & Media', shortLabel: 'Location' },
];

export default function CreateListingWizard({
  onSubmit,
  onCancel,
  isSaving = false,
  initialData
}: CreateListingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateListingInput>>({
    currency: 'GBP',
    location_country: 'United Kingdom',
    timezone: 'Europe/London',
    languages: ['English'],
    ...initialData,
  });

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (formData.title || formData.description) {
        localStorage.setItem('listing_draft', JSON.stringify(formData));
        console.log('Draft auto-saved');
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [formData]);

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

  const handleNext = (stepData: Partial<CreateListingInput>) => {
    updateFormData(stepData);
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem('listing_draft', JSON.stringify(formData));
    alert('Draft saved! You can resume later from your dashboard.');
    onCancel();
  };

  const handleFinalSubmit = (finalStepData: Partial<CreateListingInput>) => {
    const completeData = { ...formData, ...finalStepData };
    localStorage.removeItem('listing_draft');
    onSubmit(completeData as CreateListingInput);
  };

  const renderStep = () => {
    const commonProps = {
      formData,
      onNext: handleNext,
      onBack: handleBack,
      isFirstStep: currentStep === 1,
      isLastStep: currentStep === STEPS.length,
    };

    switch (currentStep) {
      case 1:
        return <Step1BasicInfo {...commonProps} />;
      case 2:
        return <Step2TeachingDetails {...commonProps} />;
      case 3:
        return <Step3ExpertiseCredentials {...commonProps} />;
      case 4:
        return <Step4PricingAvailability {...commonProps} />;
      case 5:
        return (
          <Step5LocationMedia
            {...commonProps}
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
    <div className="w-full max-w-6xl" data-wizard-version="v6">
      <div className="px-6 py-12">
        {/* Progress Dots - matching onboarding style */}
        <div className="flex justify-center items-center gap-3 mb-16">
          {STEPS.map((step) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentStep === step.id
                    ? 'bg-teal-600 scale-125'
                    : currentStep > step.id
                    ? 'bg-teal-600'
                    : 'bg-gray-300'
                }`}
              />
              {step.id < STEPS.length && (
                <div
                  className={`w-12 h-0.5 transition-colors duration-300 ${
                    currentStep > step.id ? 'bg-teal-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content - full width, centered */}
        {renderStep()}

        {/* Cancel Link */}
        <div className="mt-12 text-center">
          <button
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
