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
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-colors ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                <span
                  className={`text-xs sm:text-sm font-medium text-center ${
                    currentStep === step.id ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 transition-colors ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
        {initialData && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ✨ <strong>Pre-filled from your profile:</strong> We&apos;ve loaded your professional information. You can edit anything you&apos;d like.
            </p>
          </div>
        )}

        {renderStep()}
      </div>

      {/* Cancel Button */}
      <div className="mt-4 text-center">
        <button
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-800 text-sm font-medium"
        >
          Cancel and go back
        </button>
      </div>
    </div>
  );
}
