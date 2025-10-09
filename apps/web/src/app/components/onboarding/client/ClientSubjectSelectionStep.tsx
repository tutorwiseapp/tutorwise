'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

interface ClientSubjectSelectionStepProps {
  onNext: (subjects: string[]) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
  initialSubjects?: string[];
}

const LEARNING_SUBJECTS = [
  {
    id: 'mathematics',
    label: 'Mathematics',
    description: 'Algebra, Calculus, Geometry, Statistics',
    popular: true
  },
  {
    id: 'languages',
    label: 'Languages',
    description: 'English, Spanish, French, Mandarin',
    popular: true
  },
  {
    id: 'computer_science',
    label: 'Programming',
    description: 'Python, JavaScript, Java, Web Development',
    popular: true
  },
  {
    id: 'sciences',
    label: 'Sciences',
    description: 'Physics, Chemistry, Biology'
  },
  {
    id: 'business',
    label: 'Business',
    description: 'Accounting, Finance, Marketing'
  },
  {
    id: 'test_prep',
    label: 'Test Prep',
    description: 'SAT, ACT, GRE, GMAT'
  },
  {
    id: 'arts',
    label: 'Arts & Music',
    description: 'Drawing, Piano, Guitar, Singing'
  },
  {
    id: 'other',
    label: 'Other Subjects',
    description: 'History, Geography, Philosophy'
  }
];

const ClientSubjectSelectionStep: React.FC<ClientSubjectSelectionStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading,
  initialSubjects = []
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialSubjects);

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleNext = () => {
    if (selectedSubjects.length > 0) {
      onNext(selectedSubjects);
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          What subjects do you want to learn?
        </h2>
        <p className={styles.stepSubtitle}>
          Select all subjects you're interested in. This helps us match you with the right tutors.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.roleGrid}>
          {LEARNING_SUBJECTS.map((subject) => (
            <div
              key={subject.id}
              className={`${styles.roleCard} ${selectedSubjects.includes(subject.id) ? styles.selected : ''}`}
              onClick={() => handleSubjectToggle(subject.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.roleHeader}>
                <h3 className={styles.roleTitle}>
                  {subject.label}
                  {subject.popular && <span className={styles.popularBadge}>Popular</span>}
                </h3>
                <div className={`${styles.roleCheckbox} ${selectedSubjects.includes(subject.id) ? styles.checked : ''}`}>
                  {selectedSubjects.includes(subject.id) && '✓'}
                </div>
              </div>
              <p className={styles.roleDescription}>{subject.description}</p>
            </div>
          ))}
        </div>

        <p className={styles.progressIndicator}>
          {selectedSubjects.length > 0
            ? `✓ ${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''} selected`
            : 'Please select at least one subject'}
        </p>
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
          <button
            onClick={onSkip}
            className={styles.buttonSecondary}
            disabled={isLoading}
          >
            Skip for now
          </button>
        </div>

        <div className={styles.actionRight}>
          <button
            onClick={handleNext}
            className={`${styles.buttonPrimary} ${selectedSubjects.length === 0 ? styles.buttonDisabled : ''}`}
            disabled={selectedSubjects.length === 0 || isLoading}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientSubjectSelectionStep;
