'use client';

import React, { useState, useEffect } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons, useWizardValidation } from '../shared/WizardButton';
import { SingleSelectCardGroup, MultiSelectCardGroup } from '../shared/SelectableCard';

interface ClientAvailabilityStepProps {
  onNext: (availability: AvailabilityData) => void;
  onBack?: () => void;
  onSkip?: () => void;
  isLoading: boolean;
}

export interface AvailabilityData {
  hourlyBudget: number;
  availability: string[];
  sessionTypes: string[];
}

const budgetRanges = [
  { value: 25, label: '£25-35/hr', description: 'Entry level' },
  { value: 40, label: '£40-50/hr', description: 'Intermediate' },
  { value: 60, label: '£60-75/hr', description: 'Experienced' },
  { value: 80, label: '£80-100/hr', description: 'Expert' },
  { value: 100, label: '£100+/hr', description: 'Premium' }
];

const availabilityOptions = [
  { value: 'weekday_morning', label: 'Weekday Mornings', description: '6am - 12pm' },
  { value: 'weekday_afternoon', label: 'Weekday Afternoons', description: '12pm - 5pm' },
  { value: 'weekday_evening', label: 'Weekday Evenings', description: '5pm - 10pm' },
  { value: 'weekend_morning', label: 'Weekend Mornings', description: '6am - 12pm' },
  { value: 'weekend_afternoon', label: 'Weekend Afternoons', description: '12pm - 5pm' },
  { value: 'weekend_evening', label: 'Weekend Evenings', description: '5pm - 10pm' }
];

const sessionTypeOptions = [
  { value: 'one_on_one', label: 'One-on-One', description: 'Individual tutoring sessions' },
  { value: 'group', label: 'Group Sessions', description: 'Learning with others' },
  { value: 'online', label: 'Online Sessions', description: 'Virtual meetings' },
  { value: 'in_person', label: 'In-Person', description: 'Face-to-face sessions' }
];

const ClientAvailabilityStep: React.FC<ClientAvailabilityStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading
}) => {
  const [hourlyBudget, setHourlyBudget] = useState<number>(0);
  const [availability, setAvailability] = useState<string[]>([]);
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);

  // Validation using shared hook
  const { isValid } = useWizardValidation({
    fields: { hourlyBudget, availability, sessionTypes },
    validators: {
      hourlyBudget: (v) => v > 0,
      availability: (v) => v.length > 0,
      sessionTypes: (v) => v.length > 0,
    },
    debug: true,
  });

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('[ClientAvailabilityStep] Component mounted');
    console.log('[ClientAvailabilityStep] onNext type:', typeof onNext);
    console.log('[ClientAvailabilityStep] onNext:', onNext);
  }, [onNext]);

  // Debug: Log when validation state changes
  useEffect(() => {
    console.log('[ClientAvailabilityStep] Validation changed:', {
      isValid,
      hourlyBudget,
      availability: availability.length,
      sessionTypes: sessionTypes.length
    });
  }, [isValid, hourlyBudget, availability.length, sessionTypes.length]);

  const handleContinue = () => {
    console.log('[ClientAvailabilityStep] handleContinue called');
    console.log('[ClientAvailabilityStep] Form data:', { hourlyBudget, availability, sessionTypes });
    console.log('[ClientAvailabilityStep] isValid:', isValid);
    console.log('[ClientAvailabilityStep] Calling onNext...');

    // The WizardActionButtons component ensures this only runs when isValid is true
    onNext({ hourlyBudget, availability, sessionTypes });

    console.log('[ClientAvailabilityStep] onNext called successfully');
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Set your availability and budget preferences
        </h2>
        <p className={styles.stepSubtitle}>
          Client Onboarding • Share your schedule and budget to find the right tutors
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Hourly Budget Selection */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Hourly Budget *</label>
          <SingleSelectCardGroup
            options={budgetRanges}
            selectedValue={hourlyBudget}
            onChange={(value) => setHourlyBudget(value as number)}
            debug={true}
          />
          <p className={styles.progressIndicator}>
            💡 You can adjust your budget anytime in settings
          </p>
        </div>

        {/* Availability Selection */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            When are you available? * (Select all that apply)
          </label>
          <MultiSelectCardGroup
            options={availabilityOptions}
            selectedValues={availability}
            onChange={(values) => setAvailability(values as string[])}
            debug={true}
          />
        </div>

        {/* Session Types Selection */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Preferred Session Types * (Select all that apply)
          </label>
          <MultiSelectCardGroup
            options={sessionTypeOptions}
            selectedValues={sessionTypes}
            onChange={(values) => setSessionTypes(values as string[])}
            debug={true}
          />
        </div>

        <p className={styles.progressIndicator}>
          {isValid ? '✓ All set! Ready to continue' : 'Please complete all required fields'}
        </p>
      </div>

      {/* Action Buttons using shared component */}
      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={isValid}
        onBack={onBack}
        onSkip={onSkip}
        isLoading={isLoading}
        debug={true}
      />
    </div>
  );
};

export default ClientAvailabilityStep;
