'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { MultiSelectCardGroup } from '../shared/SelectableCard';

interface ClientSubjectSelectionStepProps {
  onNext: (subjects: string[]) => void;
  onBack?: () => void;
  onSkip?: () => void;
  isLoading: boolean;
  initialSubjects?: string[];
}

const LEARNING_SUBJECTS = [
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

const ClientSubjectSelectionStep: React.FC<ClientSubjectSelectionStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading,
  initialSubjects = []
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialSubjects);

  const handleContinue = () => {
    // The WizardActionButtons component ensures this only runs when valid
    onNext(selectedSubjects);
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          What subjects do you want to learn?
        </h2>
        <p className={styles.stepSubtitle}>
          Client Onboarding • Select all subjects you&apos;re interested in learning
        </p>
      </div>

      <div className={styles.stepBody}>
        <MultiSelectCardGroup
          options={LEARNING_SUBJECTS}
          selectedValues={selectedSubjects}
          onChange={(values) => setSelectedSubjects(values as string[])}
          debug={true}
        />

        <p className={styles.progressIndicator}>
          {selectedSubjects.length > 0
            ? `✓ ${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''} selected`
            : 'Please select at least one subject'}
        </p>
      </div>

      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={selectedSubjects.length > 0}
        onBack={onBack}
        onSkip={onSkip}
        isLoading={isLoading}
        debug={true}
      />
    </div>
  );
};

export default ClientSubjectSelectionStep;
