// src/app/components/onboarding/steps/RoleSelectionStep.tsx
'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

interface RoleSelectionStepProps {
  onNext: (roles: ('seeker' | 'provider' | 'agent')[]) => Promise<void>;
  onBack: () => void;
  onSkip: () => Promise<void>;
  isLoading: boolean;
  selectedRoles: ('seeker' | 'provider' | 'agent')[];
}

const RoleSelectionStep: React.FC<RoleSelectionStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading,
  selectedRoles: initialRoles,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<('seeker' | 'provider' | 'agent')[]>(initialRoles);

  const handleRoleToggle = (role: 'seeker' | 'provider' | 'agent') => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length > 0) {
      await onNext(selectedRoles);
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Select Your Role(s)</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>
            <input
              type="checkbox"
              checked={selectedRoles.includes('seeker')}
              onChange={() => handleRoleToggle('seeker')}
            />
            Seeker (Looking for tutors)
          </label>
          <label>
            <input
              type="checkbox"
              checked={selectedRoles.includes('provider')}
              onChange={() => handleRoleToggle('provider')}
            />
            Provider (Offering tutoring services)
          </label>
          <label>
            <input
              type="checkbox"
              checked={selectedRoles.includes('agent')}
              onChange={() => handleRoleToggle('agent')}
            />
            Agent (Managing tutoring services)
          </label>
        </div>
        {isLoading && <div>Loading...</div>}
        <div className={styles.buttonGroup}>
          <button type="button" onClick={onBack} className={styles.backButton}>
            Back
          </button>
          <button type="submit" disabled={isLoading || selectedRoles.length === 0} className={styles.nextButton}>
            Next
          </button>
          <button type="button" onClick={onSkip} className={styles.skipButton}>
            Skip
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoleSelectionStep;
