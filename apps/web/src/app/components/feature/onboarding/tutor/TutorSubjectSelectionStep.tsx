'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { MultiSelectCardGroup } from '../shared/SelectableCard';

interface TutorSubjectSelectionStepProps {
  onNext: (subjects: string[]) => void;
  onBack?: () => void;
  isLoading: boolean;
}

const subjects = [
  {
    value: 'mathematics',
    label: 'Mathematics',
    description: 'Algebra, Calculus, Geometry, Statistics',
  },
  {
    value: 'languages',
    label: 'Languages',
    description: 'English, Spanish, French, Mandarin',
  },
  {
    value: 'computer_science',
    label: 'Programming',
    description: 'Python, JavaScript, Java, Web Development',
  },
  {
    value: 'sciences',
    label: 'Sciences',
    description: 'Physics, Chemistry, Biology'
  },
  {
    value: 'business',
    label: 'Business',
    description: 'Accounting, Finance, Marketing'
  },
  {
    value: 'test_prep',
    label: 'Test Prep',
    description: 'SAT, ACT, GRE, GMAT'
  },
  {
    value: 'arts',
    label: 'Arts & Music',
    description: 'Drawing, Piano, Guitar, Singing'
  },
  {
    value: 'other',
    label: 'Other Subjects',
    description: 'History, Geography, Philosophy'
  }
];

const TutorSubjectSelectionStep: React.FC<TutorSubjectSelectionStepProps> = ({
  onNext,
  onBack,
  isLoading
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const handleContinue = () => {
    // The WizardActionButtons component ensures this only runs when valid
    onNext(selectedSubjects);
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          What subjects do you teach?
        </h2>
        <p className={styles.stepSubtitle}>
          Tutor Onboarding • Select all subjects you&apos;re qualified to tutor
        </p>
      </div>

      <div className={styles.stepBody}>
        <MultiSelectCardGroup
          options={subjects}
          selectedValues={selectedSubjects}
          onChange={(values) => setSelectedSubjects(values as string[])}
          debug={true}
        />

        <p className={styles.progressIndicator}>
          {selectedSubjects.length === 0 ? 'Select at least one subject' :
           `${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''} selected`}
        </p>
      </div>

      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={selectedSubjects.length > 0}
        onBack={onBack}
        isLoading={isLoading}
        debug={true}
      />
    </div>
  );
};

export default TutorSubjectSelectionStep;
