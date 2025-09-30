'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

interface RoleSelectionStepProps {
  selectedRoles: ('agent' | 'seeker' | 'provider')[];
  onNext: (roles: ('agent' | 'seeker' | 'provider')[]) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

const subjects = [
  {
    id: 'mathematics',
    label: 'Mathematics',
    description: 'From struggling to succeeding',
    outcome: 'Believe: Math can be your strength',
    popular: true
  },
  {
    id: 'languages',
    label: 'Languages',
    description: 'Express yourself with confidence',
    outcome: 'Learn: Speak fluently in months',
    popular: true
  },
  {
    id: 'computer_science',
    label: 'Programming',
    description: 'Create the future you imagine',
    outcome: 'Succeed: Build amazing projects',
    popular: true
  },
  {
    id: 'sciences',
    label: 'Sciences',
    description: 'Discover the wonder of how things work',
    outcome: 'Believe: You have a scientific mind'
  },
  {
    id: 'business',
    label: 'Business',
    description: 'Turn your ideas into success',
    outcome: 'Learn: Leadership & entrepreneurship'
  },
  {
    id: 'test_prep',
    label: 'Test Prep',
    description: 'Unlock doors to your dreams',
    outcome: 'Succeed: Get into your dream school'
  }
];

const RoleSelectionStep: React.FC<RoleSelectionStepProps> = ({
  selectedRoles,
  onNext,
  onBack,
  onSkip,
  isLoading
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleNext = () => {
    if (selectedSubjects.length > 0) {
      // Convert to role format for compatibility - assuming student role
      onNext(['seeker']);
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          What will you conquer?
        </h2>
        <p className={styles.stepSubtitle}>
          Choose your subjects and start your transformation. Every expert was once a beginner.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.roleGrid}>
          {subjects.map((subject) => {
            const isSelected = selectedSubjects.includes(subject.id);

            return (
              <div
                key={subject.id}
                onClick={() => handleSubjectToggle(subject.id)}
                className={`${styles.roleCard} ${isSelected ? styles.selected : ''} ${subject.popular ? styles.popular : ''}`}
              >
                {subject.popular && (
                  <div className={styles.popularBadge}>Most Popular</div>
                )}

                <div className={styles.roleHeader}>
                  <h3 className={styles.roleTitle}>{subject.label}</h3>
                  <div className={`${styles.roleCheckbox} ${isSelected ? styles.checked : ''}`}>
                    {isSelected && (
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4.5L4.5 8L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>

                <p className={styles.roleDescription}>{subject.description}</p>

                <div className={styles.outcomeBox}>
                  <span className={styles.outcomeText}>✨ {subject.outcome}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          {onBack && (
            <button
              onClick={onBack}
              className={styles.buttonSecondary}
              disabled={isLoading}
            >
              ← Back
            </button>
          )}
        </div>

        <div className={styles.actionRight}>
          <button
            onClick={onSkip}
            className={styles.buttonSecondary}
            disabled={isLoading}
          >
            Skip for now
          </button>

          <button
            onClick={handleNext}
            disabled={selectedSubjects.length === 0 || isLoading}
            className={`${styles.buttonPrimary} ${(selectedSubjects.length === 0 || isLoading) ? styles.buttonDisabled : ''}`}
          >
            {isLoading ? (
              <>
                <div className={styles.loadingSpinner}></div>
                Saving...
              </>
            ) : (
              'Next →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionStep;