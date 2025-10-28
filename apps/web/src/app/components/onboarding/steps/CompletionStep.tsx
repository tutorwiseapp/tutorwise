'use client';

/* eslint-disable react/no-unescaped-entities */
import React, { useEffect } from 'react';
import styles from './CompletionStep.module.css';

interface CompletionStepProps {
  selectedRoles: ('agent' | 'client' | 'tutor')[];
  onComplete: () => void;
  isLoading?: boolean;
}

const CompletionStep: React.FC<CompletionStepProps> = ({ onComplete }) => {
  useEffect(() => {
    console.log('[CompletionStep] Component mounted. Database update already complete. Showing success message...');

    // Wait 2 seconds for the user to see the success message, then redirect
    const timer = setTimeout(() => {
      console.log('[CompletionStep] ✅ Redirecting to dashboard...');
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={styles.completionContainer}>
      <div className={styles.successIcon}>✓</div>
      <h2 className={styles.successTitle}>Welcome to Tutorwise!</h2>
      <p className={styles.successMessage}>
        Setting up your profile... You will be redirected to your dashboard shortly.
      </p>
    </div>
  );
};

export default CompletionStep;