'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons, useWizardValidation } from '../shared/WizardButton';
import { MultiSelectCardGroup } from '../shared/SelectableCard';

interface ClientAvailabilityStepProps {
  onNext: (availability: AvailabilityData) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

export interface AvailabilityData {
  availability: string[];
  sessionTypes: string[];
}

const availabilityOptions = [
  { value: 'weekday_morning', label: 'Weekday Mornings', description: '6am - 12pm' },
  { value: 'weekday_afternoon', label: 'Weekday Afternoons', description: '12pm - 5pm' },
  { value: 'weekday_evening', label: 'Weekday Evenings', description: '5pm - 10pm' },
  { value: 'weekend_morning', label: 'Weekend Mornings', description: '6am - 12pm' },
  { value: 'weekend_afternoon', label: 'Weekend Afternoons', description: '12pm - 5pm' },
  { value: 'weekend_evening', label: 'Weekend Evenings', description: '5pm - 10pm' }
];

const sessionTypeOptions = [
  { value: 'one_on_one', label: 'One-on-One', description: 'Individual tutoring sessions', icon: '👤' },
  { value: 'group', label: 'Group Sessions', description: 'Learning with others', icon: '👥' },
  { value: 'online', label: 'Online Sessions', description: 'Virtual meetings', icon: '💻' },
  { value: 'in_person', label: 'In-Person', description: 'Face-to-face sessions', icon: '🏠' }
];

const ClientAvailabilityStep: React.FC<ClientAvailabilityStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading
}) => {
  const [availability, setAvailability] = useState<string[]>([]);
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);

  // Validation using shared hook
  const { isValid } = useWizardValidation({
    fields: { availability, sessionTypes },
    validators: {
      availability: (v) => v.length > 0,
      sessionTypes: (v) => v.length > 0,
    },
    debug: true,
  });

  const handleContinue = () => {
    console.log('[ClientAvailabilityStep] handleContinue called');
    console.log('[ClientAvailabilityStep] Form data:', { availability, sessionTypes });
    console.log('[ClientAvailabilityStep] Calling onNext...');

    // The WizardActionButtons component ensures this only runs when isValid is true
    onNext({ availability, sessionTypes });

    console.log('[ClientAvailabilityStep] onNext called successfully');
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          When are you available for tutoring?
        </h2>
        <p className={styles.stepSubtitle}>
          Help us match you with tutors who fit your schedule
        </p>
      </div>

      <div className={styles.stepBody}>
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
