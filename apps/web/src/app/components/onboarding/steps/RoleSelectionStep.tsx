'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

interface RoleSelectionStepProps {
  selectedRoles: ('agent' | 'seeker' | 'provider')[];
  onNext: (roles: ('agent' | 'seeker' | 'provider')[]) => void;
  onSkip: () => void;
  isLoading: boolean;
}

const roles = [
  {
    id: 'seeker' as const,
    label: 'Student',
    description: 'I want to learn new skills and find tutors',
    features: ['Find qualified tutors', 'Book sessions', 'Track progress', 'Secure payments']
  },
  {
    id: 'provider' as const,
    label: 'Tutor',
    description: 'I want to teach and share my expertise',
    features: ['Create your profile', 'Set your rates', 'Manage bookings', 'Earn income']
  },
  {
    id: 'agent' as const,
    label: 'Agent',
    description: 'I want to connect students with tutors and earn commissions',
    features: ['Build your network', 'Refer students', 'Track commissions', 'Grow your business']
  }
];

const RoleSelectionStep: React.FC<RoleSelectionStepProps> = ({
  selectedRoles,
  onNext,
  onSkip,
  isLoading
}) => {
  const [selected, setSelected] = useState<('agent' | 'seeker' | 'provider')[]>(selectedRoles);

  const handleRoleToggle = (roleId: 'agent' | 'seeker' | 'provider') => {
    setSelected(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleNext = () => {
    if (selected.length > 0) {
      onNext(selected);
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          How do you want to use Tutorwise?
        </h2>
        <p className={styles.stepSubtitle}>
          You can select multiple roles. We&apos;ll customize your experience for each one.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.roleGrid}>
          {roles.map((role) => {
            const isSelected = selected.includes(role.id);

            return (
              <div
                key={role.id}
                onClick={() => handleRoleToggle(role.id)}
                className={`${styles.roleCard} ${isSelected ? styles.selected : ''}`}
              >
                <h3 className={styles.roleTitle}>{role.label}</h3>
                <p className={styles.roleDescription}>{role.description}</p>

                <div className={styles.checkboxGroup}>
                  {role.features.map((feature, index) => (
                    <div key={index} className={styles.checkboxItem}>
                      <span className={styles.checkboxLabel}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.stepActions}>
        <button
          onClick={onSkip}
          className={styles.buttonSecondary}
          disabled={isLoading}
        >
          Skip for now
        </button>

        <button
          onClick={handleNext}
          disabled={selected.length === 0 || isLoading}
          className={`${styles.buttonPrimary} ${(selected.length === 0 || isLoading) ? styles.buttonDisabled : ''}`}
        >
          {isLoading ? (
            <>
              <div className={styles.loadingSpinner}></div>
              Saving...
            </>
          ) : (
            'Continue →'
          )}
        </button>
      </div>
    </div>
  );
};

export default RoleSelectionStep;