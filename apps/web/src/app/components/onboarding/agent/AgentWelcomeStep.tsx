'use client';

import React from 'react';
import styles from '../OnboardingWizard.module.css';

interface AgentWelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
  userName: string;
}

const AgentWelcomeStep: React.FC<AgentWelcomeStepProps> = ({ onNext, onSkip, userName }) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>
          Scale. Connect. Grow.
        </h1>
        <p className={styles.stepSubtitle}>
          {userName}, join leading tutoring agencies building thriving businesses on our platform.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.benefitsList}>
          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>🚀</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Scale your agency</h4>
              <p className={styles.benefitDescription}>Expand your reach and serve more students effortlessly</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>🤝</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Connect with talent</h4>
              <p className={styles.benefitDescription}>Access a network of qualified tutors and grow your team</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>📊</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Streamline operations</h4>
              <p className={styles.benefitDescription}>Manage bookings, payments, and communications in one place</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>💼</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Grow your business</h4>
              <p className={styles.benefitDescription}>Build a sustainable agency with predictable revenue streams</p>
            </div>
          </div>
        </div>

        <div className={styles.socialProof}>
          <p className={styles.socialProofText}>
            &ldquo;Tutorwise transformed how we run our agency. We&apos;ve tripled our client base in 6 months.&rdquo; - Sarah K., Agency Owner
          </p>
        </div>

        <p className={styles.progressIndicator}>
          Takes 5 minutes • Start growing your agency today
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
          Yes, let&apos;s grow my agency →
        </button>
      </div>
    </div>
  );
};

export default AgentWelcomeStep;
