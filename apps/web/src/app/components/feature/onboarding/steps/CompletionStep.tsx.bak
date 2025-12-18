'use client';

/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ReferralAssetWidget from '@/app/components/feature/referrals/ReferralAssetWidget';
import styles from './CompletionStep.module.css';

interface CompletionStepProps {
  selectedRoles: ('agent' | 'client' | 'tutor')[];
  onComplete: () => void;
  isLoading?: boolean;
}

const CompletionStep: React.FC<CompletionStepProps> = ({ onComplete }) => {
  const { profile } = useUserProfile();
  const [showLaunchpad, setShowLaunchpad] = useState(false);

  useEffect(() => {
    console.log('[CompletionStep] Component mounted. Database update already complete.');

    // Show success message first, then transition to launchpad
    const timer = setTimeout(() => {
      console.log('[CompletionStep] ✅ Transitioning to launchpad with referral assets');
      setShowLaunchpad(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Success screen (shown initially)
  if (!showLaunchpad) {
    return (
      <div className={styles.completionContainer}>
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>Welcome to Tutorwise!</h2>
        <p className={styles.successMessage}>
          Your profile is ready. Setting up your referral tools...
        </p>
      </div>
    );
  }

  // Launchpad screen (shown after transition)
  return (
    <div className={styles.launchpadContainer}>
      <div className={styles.header}>
        <div className={styles.successIconSmall}>✓</div>
        <h2 className={styles.launchpadTitle}>You're All Set!</h2>
        <p className={styles.launchpadSubtitle}>
          Start earning commissions by sharing your unique referral link
        </p>
      </div>

      {/* Referral Asset Widget (SDD v4.3, Section 2.2) */}
      {profile?.referral_code && (
        <div className={styles.widgetContainer}>
          <ReferralAssetWidget
            referralCode={profile.referral_code}
            variant="onboarding"
          />
        </div>
      )}

      {/* Continue to Dashboard Button */}
      <div className={styles.actions}>
        <button
          onClick={onComplete}
          className={styles.continueButton}
        >
          Continue to Dashboard →
        </button>
        <p className={styles.hint}>
          You can access these tools anytime from your Referrals page
        </p>
      </div>
    </div>
  );
};

export default CompletionStep;