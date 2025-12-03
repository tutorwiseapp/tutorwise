// src/app/components/feature/onboarding/OnboardingProgressBar.tsx
'use client';

import React from 'react';
import styles from './OnboardingWizard.module.css';

export interface OnboardingProgressBarProps {
  currentStepId: number;
  totalSteps: number;
}

const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({ currentStepId, totalSteps }) => {
  const progress = (currentStepId / totalSteps) * 100;

  return (
    <div className={styles.progressBarContainer}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentStepId}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        />
      </div>
      <p className={styles.progressText}>
        Step {currentStepId} of {totalSteps}
      </p>
    </div>
  );
};

export default OnboardingProgressBar;