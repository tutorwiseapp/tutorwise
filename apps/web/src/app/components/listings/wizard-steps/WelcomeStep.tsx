'use client';

import styles from '../../onboarding/OnboardingWizard.module.css';

interface WelcomeStepProps {
  userName: string;
  onNext: () => void;
  onSkip: () => void;
}

export default function WelcomeStep({ userName, onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>
          Create Your Tutoring Service
        </h1>
        <p className={styles.stepSubtitle}>
          {userName}, let&apos;s create a compelling listing that attracts the right students.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.benefitsList}>
          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>✨</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Stand out</h4>
              <p className={styles.benefitDescription}>Showcase your expertise and unique teaching approach</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>🎯</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Attract ideal students</h4>
              <p className={styles.benefitDescription}>Connect with students who match your teaching style</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>💼</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Set your terms</h4>
              <p className={styles.benefitDescription}>Control your pricing, schedule, and teaching methods</p>
            </div>
          </div>

          <div className={styles.benefit}>
            <div className={styles.benefitIcon}>📈</div>
            <div className={styles.benefitContent}>
              <h4 className={styles.benefitTitle}>Grow your business</h4>
              <p className={styles.benefitDescription}>Build a strong profile that attracts more bookings</p>
            </div>
          </div>
        </div>

        <div className={styles.socialProof}>
          <p className={styles.socialProofText}>
            &ldquo;A well-crafted listing tripled my bookings in the first month.&rdquo; - Sarah K., English Tutor
          </p>
        </div>

        <p className={styles.progressIndicator}>
          Takes 5-7 minutes • Create once, book students continuously
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
          Let&apos;s create my listing →
        </button>
      </div>
    </div>
  );
}
