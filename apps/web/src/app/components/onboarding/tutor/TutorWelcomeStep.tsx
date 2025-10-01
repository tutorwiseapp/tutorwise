'use client';

import React from 'react';
import styles from '../OnboardingWizard.module.css';

interface TutorWelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
  userName: string;
}

const TutorWelcomeStep: React.FC<TutorWelcomeStepProps> = ({ onNext, onSkip, userName }) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>
          Inspire. Teach. Transform.
        </h1>
        <p className={styles.stepSubtitle}>
          {userName}, join thousands of tutors making a real difference in students&apos; lives every day.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.benefitsList}>
          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>💡</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Inspire students</h4>
              <p className={styles.benefitDescription}>Help students discover their potential and love learning</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>📖</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Teach your way</h4>
              <p className={styles.benefitDescription}>Set your own schedule, rates, and teaching methods</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>💰</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Earn great income</h4>
              <p className={styles.benefitDescription}>Get paid fairly for your expertise and impact</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>🌟</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Transform lives</h4>
              <p className={styles.benefitDescription}>Watch your students succeed and achieve their dreams</p>
            </div>
          </div>
        </div>

        <div className={styles.socialProof}>
          <p className={styles.socialProofText}>
            &ldquo;Teaching on Tutorwise changed my life. I help students succeed while building my own business.&rdquo; - Michael R., Math Tutor
          </p>
        </div>

        <p className={styles.progressIndicator}>
          Takes 5 minutes • Start making a difference today
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
          Yes, I&apos;m ready to teach →
        </button>
      </div>
    </div>
  );
};

export default TutorWelcomeStep;
