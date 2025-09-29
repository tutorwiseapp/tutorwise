'use client';

import React from 'react';
import styles from '../OnboardingWizard.module.css';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
  userName: string;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext, onSkip, userName }) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>
          Welcome to Tutorwise, {userName}! 🎉
        </h1>
        <p className={styles.stepSubtitle}>
          Let&apos;s get you set up with a personalized experience. This quick setup will help us understand how you&apos;d like to use Tutorwise.
        </p>
      </div>

      <div className={styles.stepBody}>
        <h3 className={styles.formLabel}>What we&apos;ll cover:</h3>
        <div className={styles.checkboxGroup}>
          <div className={styles.checkboxItem}>
            <span className={styles.checkboxLabel}>Choose your role(s) - Student, Tutor, or Agent</span>
          </div>
          <div className={styles.checkboxItem}>
            <span className={styles.checkboxLabel}>Set up your preferences and goals</span>
          </div>
          <div className={styles.checkboxItem}>
            <span className={styles.checkboxLabel}>Customize your dashboard</span>
          </div>
        </div>

        <p className={styles.progressIndicator}>
          Takes about 2-3 minutes • You can always change these settings later
        </p>
      </div>

      <div className={styles.stepActions}>
        <button
          onClick={onSkip}
          className={styles.buttonSecondary}
        >
          Skip for now
        </button>

        <button
          onClick={onNext}
          className={styles.buttonPrimary}
        >
          Let&apos;s get started →
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;