// apps/web/src/app/components/feature/onboarding/steps/WelcomeStep.tsx

import React from 'react';
import Button from '@/app/components/ui/actions/Button';
import styles from '../OnboardingWizard.module.css';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip?: () => void;
  userName: string;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext, onSkip, userName }) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 id="onboarding-title" className={styles.stepTitle}>
          Welcome to Tutorwise, {userName}!
        </h1>
        <p className={styles.stepSubtitle}>
          Let&apos;s get you started. A few quick questions will help us personalize your experience.
        </p>
      </div>
      <div className={styles.stepActions} style={{ justifyContent: 'center' }}>
        <Button onClick={onNext} type="button" size="lg">Let&apos;s Get Started</Button>
        {onSkip && <Button onClick={onSkip} type="button" variant="secondary" size="lg">Skip for now</Button>}
      </div>
    </div>
  );
};

export default WelcomeStep;
