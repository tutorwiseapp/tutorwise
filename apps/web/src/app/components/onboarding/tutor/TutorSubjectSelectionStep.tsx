'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

interface TutorSubjectSelectionStepProps {
  onNext: (subjects: string[]) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

const subjects = [
  {
    id: 'mathematics',
    label: 'Mathematics',
    description: 'Algebra, Calculus, Geometry, Statistics',
    outcome: 'Teach: Help students master math concepts',
    popular: true
  },
  {
    id: 'languages',
    label: 'Languages',
    description: 'English, Spanish, French, Mandarin',
    outcome: 'Teach: Guide students to fluency',
    popular: true
  },
  {
    id: 'computer_science',
    label: 'Programming',
    description: 'Python, JavaScript, Java, Web Development',
    outcome: 'Teach: Build future developers',
    popular: true
  },
  {
    id: 'sciences',
    label: 'Sciences',
    description: 'Physics, Chemistry, Biology',
    outcome: 'Teach: Inspire scientific thinking'
  },
  {
    id: 'business',
    label: 'Business',
    description: 'Accounting, Finance, Marketing',
    outcome: 'Teach: Develop business leaders'
  },
  {
    id: 'test_prep',
    label: 'Test Prep',
    description: 'SAT, ACT, GRE, GMAT',
    outcome: 'Teach: Help students ace exams'
  },
  {
    id: 'arts',
    label: 'Arts & Music',
    description: 'Drawing, Piano, Guitar, Singing',
    outcome: 'Teach: Nurture creative talents'
  },
  {
    id: 'other',
    label: 'Other Subjects',
    description: 'History, Geography, Philosophy',
    outcome: 'Teach: Share your expertise'
  }
];

const TutorSubjectSelectionStep: React.FC<TutorSubjectSelectionStepProps> = ({
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
      onNext(selectedSubjects);
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          What subjects do you teach?
        </h2>
        <p className={styles.stepSubtitle}>
          Select all subjects you&apos;re qualified to tutor. You can always add more later.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.roleGrid}>
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className={`${styles.roleCard} ${selectedSubjects.includes(subject.id) ? styles.selected : ''} ${subject.popular ? styles.popular : ''}`}
              onClick={() => handleSubjectToggle(subject.id)}
            >
              {subject.popular && <span className={styles.popularBadge}>Popular</span>}

              <div className={styles.roleHeader}>
                <h3 className={styles.roleTitle}>{subject.label}</h3>
                <div className={`${styles.roleCheckbox} ${selectedSubjects.includes(subject.id) ? styles.checked : ''}`}>
                  {selectedSubjects.includes(subject.id) && '✓'}
                </div>
              </div>

              <p className={styles.roleDescription}>{subject.description}</p>

              <div className={styles.outcomeBox}>
                <span className={styles.outcomeText}>{subject.outcome}</span>
              </div>
            </div>
          ))}
        </div>

        <p className={styles.progressIndicator}>
          {selectedSubjects.length === 0 ? 'Select at least one subject' :
           `${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''} selected`}
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
            className={styles.buttonPrimary}
            disabled={selectedSubjects.length === 0 || isLoading}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorSubjectSelectionStep;
