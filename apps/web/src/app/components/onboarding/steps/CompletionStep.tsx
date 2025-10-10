'use client';

/* eslint-disable react/no-unescaped-entities */
import React, { useEffect } from 'react';
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
  // Auto-redirect immediately
  useEffect(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className={styles.completionContainer}>
      <p>Completing onboarding...</p>
    </div>
  );
};

export default CompletionStep;