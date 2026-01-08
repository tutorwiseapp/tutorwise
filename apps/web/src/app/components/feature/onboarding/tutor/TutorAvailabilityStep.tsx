'use client';

import React, { useState, useEffect } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons, useWizardValidation } from '../shared/WizardButton';
import { SingleSelectCardGroup, MultiSelectCardGroup } from '../shared/SelectableCard';

interface TutorAvailabilityStepProps {
  onNext: (availability: AvailabilityData) => void;
  onBack?: () => void;
  onSkip?: () => void;
  isLoading: boolean;
}

export interface AvailabilityData {
  hourlyRate: number;
  availability: string[];
  sessionTypes: string[];
}

const rateRanges = [
  { value: 25, label: '$25-35/hr', description: 'Entry level' },
  { value: 40, label: '$40-50/hr', description: 'Intermediate' },
  { value: 60, label: '$60-75/hr', description: 'Experienced' },
  { value: 80, label: '$80-100/hr', description: 'Expert' },
  { value: 100, label: '$100+/hr', description: 'Premium' }
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
  { value: 'group', label: 'Group Sessions', description: 'Multiple students at once' },
  { value: 'online', label: 'Online Sessions', description: 'Virtual meetings' },
  { value: 'in_person', label: 'In-Person', description: 'Face-to-face sessions' }
];

const TutorAvailabilityStep: React.FC<TutorAvailabilityStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading
}) => {
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [availability, setAvailability] = useState<string[]>([]);
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);

  // Validation using shared hook
  const { isValid } = useWizardValidation({
    fields: { hourlyRate, availability, sessionTypes },
    validators: {
      hourlyRate: (v) => v > 0,
      availability: (v) => v.length > 0,
      sessionTypes: (v) => v.length > 0,
    },
    debug: true,
  });

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('[TutorAvailabilityStep] Component mounted');
    console.log('[TutorAvailabilityStep] onNext type:', typeof onNext);
    console.log('[TutorAvailabilityStep] onNext:', onNext);
  }, [onNext]);

  // Debug: Log when validation state changes
  useEffect(() => {
    console.log('[TutorAvailabilityStep] Validation changed:', {
      isValid,
      hourlyRate,
      availability: availability.length,
      sessionTypes: sessionTypes.length
    });
  }, [isValid, hourlyRate, availability.length, sessionTypes.length]);

  const handleContinue = () => {
    console.log('[TutorAvailabilityStep] handleContinue called');
    console.log('[TutorAvailabilityStep] Form data:', { hourlyRate, availability, sessionTypes });
    console.log('[TutorAvailabilityStep] isValid:', isValid);
    console.log('[TutorAvailabilityStep] Calling onNext...');

    // The WizardActionButtons component ensures this only runs when isValid is true
    onNext({ hourlyRate, availability, sessionTypes });

    console.log('[TutorAvailabilityStep] onNext called successfully');
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Set your availability and rates
        </h2>
        <p className={styles.stepSubtitle}>
          Let students know when you&apos;re available and what you charge
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Hourly Rate Selection */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Hourly Rate *</label>
          <SingleSelectCardGroup
            options={rateRanges}
            selectedValue={hourlyRate}
            onChange={(value) => setHourlyRate(value as number)}
            debug={true}
          />
          <p className={styles.progressIndicator}>
            💡 You can adjust your rate anytime in settings
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
            Session Types * (Select all that apply)
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

export default TutorAvailabilityStep;
