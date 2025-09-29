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
          Believe. Learn. Succeed.
        </h1>
        <p className={styles.stepSubtitle}>
          {userName}, join thousands of students who&apos;ve discovered their potential with personalized tutoring.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.benefitsList}>
          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>✨</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Believe in yourself</h4>
              <p className={styles.benefitDescription}>Build confidence with supportive, expert guidance</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>📚</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Learn your way</h4>
              <p className={styles.benefitDescription}>Personalized lessons that match how you think</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>🎯</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Succeed faster</h4>
              <p className={styles.benefitDescription}>Achieve breakthrough results in weeks, not years</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>🤝</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Never learn alone</h4>
              <p className={styles.benefitDescription}>Your dedicated tutor believes in your success</p>
            </div>
          </div>
        </div>

        <div className={styles.socialProof}>
          <p className={styles.socialProofText}>
            &ldquo;My tutor didn&apos;t just teach me math - they taught me to believe I could do anything!&rdquo; - Sarah K.
          </p>
        </div>

        <p className={styles.progressIndicator}>
          Takes 2 minutes • Start believing in yourself today
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
          Yes, I&apos;m ready to succeed →
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;