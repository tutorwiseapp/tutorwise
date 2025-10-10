'use client';

/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState } from 'react';
import styles from './CompletionStep.module.css';

interface CompletionStepProps {
  selectedRoles: ('agent' | 'seeker' | 'provider')[];
  onComplete: () => void;
  isLoading?: boolean;
}

const roleLabels = {
  seeker: 'Student',
  provider: 'Tutor',
  agent: 'Agent'
};

const CompletionStep: React.FC<CompletionStepProps> = ({ selectedRoles, onComplete, isLoading = false }) => {
  const [countdown, setCountdown] = useState(3);

  // Auto-redirect after 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={styles.completionContainer}>
      <div className={styles.successSection}>
        <div className={styles.checkmarkContainer}>
          <svg className={styles.checkmarkIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className={styles.successTitle}>
          You&apos;re all set! 🎉
        </h2>

        <p className={styles.successMessage}>
          Welcome to Tutorwise! Your profile has been configured and you&apos;re ready to start your journey.
        </p>
      </div>

      {/* Role Summary */}
      <div className={styles.roleSummary}>
        <h3 className={styles.roleSummaryTitle}>Your Roles:</h3>
        <div className={styles.rolesList}>
          {selectedRoles.map((role) => (
            <div key={role} className={styles.roleItem}>
              <div className={`${styles.roleDot} ${styles[role]}`}></div>
              <span className={styles.roleLabel}>{roleLabels[role]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className={styles.nextSteps}>
        <h3 className={styles.nextStepsTitle}>What's next?</h3>
        <div className={styles.nextStepsList}>
          {selectedRoles.includes('seeker') && (
            <div className={styles.nextStepItem}>
              <div className={`${styles.nextStepDot} ${styles.seeker}`}></div>
              <div className={styles.nextStepContent}>
                <span className={`${styles.nextStepRole} ${styles.seeker}`}>As a Student:</span>
                <span className={`${styles.nextStepDescription} ${styles.seeker}`}>Browse tutors, book sessions, and start learning!</span>
              </div>
            </div>
          )}
          {selectedRoles.includes('provider') && (
            <div className={styles.nextStepItem}>
              <div className={`${styles.nextStepDot} ${styles.provider}`}></div>
              <div className={styles.nextStepContent}>
                <span className={`${styles.nextStepRole} ${styles.provider}`}>As a Tutor:</span>
                <span className={`${styles.nextStepDescription} ${styles.provider}`}>Complete your profile and start accepting bookings!</span>
              </div>
            </div>
          )}
          {selectedRoles.includes('agent') && (
            <div className={styles.nextStepItem}>
              <div className={`${styles.nextStepDot} ${styles.agent}`}></div>
              <div className={styles.nextStepContent}>
                <span className={`${styles.nextStepRole} ${styles.agent}`}>As an Agent:</span>
                <span className={`${styles.nextStepDescription} ${styles.agent}`}>Start building your network and earn commissions!</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className={styles.tips}>
        <p>💡 Tip: You can switch between your roles anytime using the role switcher in the top navigation.</p>
        <p>🔧 You can also update your preferences and profile information in your account settings.</p>
      </div>

      {/* Auto-redirect message */}
      <div className={styles.redirectMessage}>
        <p>Redirecting to your dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
      </div>

      {/* Manual Action Button */}
      <button
        onClick={onComplete}
        className={styles.dashboardButton}
        disabled={isLoading}
      >
        {isLoading ? 'Completing...' : 'Go to Dashboard Now'}
        {!isLoading && (
          <svg className={styles.arrowIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default CompletionStep;