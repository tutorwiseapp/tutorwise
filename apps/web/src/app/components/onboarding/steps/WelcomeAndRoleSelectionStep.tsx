// apps/web/src/app/components/onboarding/steps/WelcomeAndRoleSelectionStep.tsx

'use client';

import React, { useState } from 'react';
import { Role } from '@/types';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { MultiSelectCardGroup } from '../shared/SelectableCard';

interface WelcomeAndRoleSelectionStepProps {
  onNext: (roles: Role[]) => Promise<void>;
  onSkip: () => Promise<void>;
  isLoading: boolean;
  selectedRoles: Role[];
  userName: string;
}

const roleOptions = [
  {
    value: 'client',
    label: "I'm seeking a tutor",
    description: 'Find and connect with qualified tutors'
  },
  {
    value: 'tutor',
    label: "I'm a tutor",
    description: 'Offer your tutoring services'
  },
  {
    value: 'agent',
    label: "I'm an agent",
    description: 'Manage tutoring services and connections'
  }
];

const WelcomeAndRoleSelectionStep: React.FC<WelcomeAndRoleSelectionStepProps> = ({
  onNext,
  onSkip,
  isLoading,
  selectedRoles: initialRoles,
  userName
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);

  const handleContinue = async () => {
    if (selectedRoles.length > 0) {
      await onNext(selectedRoles as Role[]);
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 id="onboarding-title" className={styles.stepTitle}>
          Welcome to Tutorwise{userName ? `, ${userName}` : ''}!
        </h1>
        <p className={styles.stepSubtitle}>
          Let&apos;s get you started. First, tell us how you&apos;d like to use Tutorwise.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Select your role(s) * (You can select more than one)
          </label>
          <MultiSelectCardGroup
            options={roleOptions}
            selectedValues={selectedRoles}
            onChange={(values) => setSelectedRoles(values as string[])}
            debug={true}
          />
        </div>

        <p className={styles.progressIndicator}>
          {selectedRoles.length > 0
            ? `✓ ${selectedRoles.length} role${selectedRoles.length > 1 ? 's' : ''} selected`
            : 'Please select at least one role to continue'}
        </p>
      </div>

      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={selectedRoles.length > 0}
        onSkip={onSkip}
        isLoading={isLoading}
        debug={true}
      />
    </div>
  );
};

export default WelcomeAndRoleSelectionStep;
