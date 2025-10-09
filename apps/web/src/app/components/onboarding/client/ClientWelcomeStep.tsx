'use client';

import React from 'react';
import styles from '../OnboardingWizard.module.css';

interface ClientWelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
  userName: string;
}

const ClientWelcomeStep: React.FC<ClientWelcomeStepProps> = ({
  onNext,
  onSkip,
  userName
}) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Welcome, {userName}! 🎓
        </h2>
        <p className={styles.stepSubtitle}>
          Let&apos;s find the perfect tutor for your learning journey
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.welcomeContent}>
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeIcon}>🔍</div>
            <h3 className={styles.welcomeCardTitle}>Discover Great Tutors</h3>
            <p className={styles.welcomeCardText}>
              Access qualified tutors across all subjects and levels
            </p>
          </div>

          <div className={styles.welcomeCard}>
            <div className={styles.welcomeIcon}>📚</div>
            <h3 className={styles.welcomeCardTitle}>Personalized Learning</h3>
            <p className={styles.welcomeCardText}>
              Get matched with tutors who fit your learning style and goals
            </p>
          </div>

          <div className={styles.welcomeCard}>
            <div className={styles.welcomeIcon}>💡</div>
            <h3 className={styles.welcomeCardTitle}>Achieve Your Goals</h3>
            <p className={styles.welcomeCardText}>
              Track your progress and reach your academic potential
            </p>
          </div>
        </div>

        <div className={styles.motivationalQuote}>
          <p className={styles.quoteText}>
            &ldquo;Education is the most powerful weapon which you can use to change the world.&rdquo;
          </p>
          <p className={styles.quoteAuthor}>— Nelson Mandela</p>
        </div>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          <button
            onClick={onSkip}
            className={styles.buttonSecondary}
          >
            Skip for now
          </button>
        </div>

        <div className={styles.actionRight}>
          <button
            onClick={onNext}
            className={styles.buttonPrimary}
          >
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientWelcomeStep;
