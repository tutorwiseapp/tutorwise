'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { SingleSelectCardGroup } from '../shared/SelectableCard';

export interface PreferencesData {
  location?: string;
  learningStyle?: string;
}

interface ClientLearningPreferencesStepProps {
  onNext: (preferences: PreferencesData) => void;
  onBack: () => void;
  isLoading: boolean;
}

const learningStyleOptions = [
  { value: 'visual', label: 'Visual Learner', description: 'Learn best through images, diagrams, and visual aids' },
  { value: 'auditory', label: 'Auditory Learner', description: 'Learn best through listening and verbal instruction' },
  { value: 'kinesthetic', label: 'Kinesthetic Learner', description: 'Learn best through hands-on practice and movement' },
  { value: 'reading', label: 'Reading/Writing Learner', description: 'Learn best through reading and taking notes' }
];

const ClientLearningPreferencesStep: React.FC<ClientLearningPreferencesStepProps> = ({
  onNext,
  onBack,
  isLoading,
}) => {
  const [location, setLocation] = useState('');
  const [learningStyle, setLearningStyle] = useState('');

  const handleNext = () => {
    // The WizardActionButtons component ensures this only runs when valid
    // These fields are all optional, so we always allow continuing
    onNext({ location, learningStyle });
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Learning Preferences</h2>
        <p className={styles.stepSubtitle}>
          Client Onboarding • Share your learning preferences to find the best tutors
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Preferred Location */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="location">
            Preferred Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., London or Online"
            className={styles.formInput}
          />
        </div>

        {/* Learning Style */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Learning Style (Optional)
          </label>
          <SingleSelectCardGroup
            options={learningStyleOptions}
            selectedValue={learningStyle}
            onChange={(value) => setLearningStyle(value as string)}
            
          />
        </div>

        <p className={styles.progressIndicator}>
          💡 All fields are optional - you can skip this step or fill in details later
        </p>
      </div>

      <WizardActionButtons
        onNext={handleNext}
        nextEnabled={true}
        onBack={onBack}
        isLoading={isLoading}
        
      />
    </div>
  );
};

export default ClientLearningPreferencesStep;
