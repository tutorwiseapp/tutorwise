'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { MultiSelectCardGroup } from '../shared/SelectableCard';

interface AgentServicesStepProps {
  onNext: (services: string[]) => void;
  onBack?: () => void;
  isLoading: boolean;
}

const services = [
  {
    value: 'academic_tutoring',
    label: 'Academic Tutoring',
    description: 'K-12 and college subject tutoring',
  },
  {
    value: 'test_prep',
    label: 'Test Preparation',
    description: 'SAT, ACT, GRE, GMAT prep',
  },
  {
    value: 'language_learning',
    label: 'Language Learning',
    description: 'ESL, foreign languages, linguistics',
  },
  {
    value: 'stem_tutoring',
    label: 'STEM Tutoring',
    description: 'Math, Science, Programming, Engineering'
  },
  {
    value: 'special_needs',
    label: 'Special Needs',
    description: 'Learning disabilities, IEP support'
  },
  {
    value: 'college_prep',
    label: 'College Preparation',
    description: 'Essay writing, application support, college counseling'
  },
  {
    value: 'career_coaching',
    label: 'Career Coaching',
    description: 'Resume building, interview prep, career planning'
  },
  {
    value: 'enrichment',
    label: 'Enrichment Programs',
    description: 'Music, arts, sports, hobby instruction'
  }
];

const AgentServicesStep: React.FC<AgentServicesStepProps> = ({
  onNext,
  onBack,
  isLoading
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const handleNext = () => {
    // The WizardActionButtons component ensures this only runs when valid
    onNext(selectedServices);
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          What services does your agency provide?
        </h2>
        <p className={styles.stepSubtitle}>
          Agent Onboarding • Select all educational services your agency offers
        </p>
      </div>

      <div className={styles.stepBody}>
        <MultiSelectCardGroup
          options={services}
          selectedValues={selectedServices}
          onChange={(values) => setSelectedServices(values as string[])}
          debug={true}
        />

        <p className={styles.progressIndicator}>
          {selectedServices.length === 0 ? 'Select at least one service' :
           `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`}
        </p>
      </div>

      <WizardActionButtons
        onNext={handleNext}
        nextEnabled={selectedServices.length > 0}
        onBack={onBack}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AgentServicesStep;
