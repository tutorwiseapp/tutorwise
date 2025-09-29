'use client';

import React from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import OnboardingWizard from './OnboardingWizard';

interface OnboardingProviderProps {
  children: React.ReactNode;
}

const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { needsOnboarding, showOnboarding, setShowOnboarding } = useUserProfile();

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Optional: Refresh the page or redirect to dashboard
    window.location.reload();
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  return (
    <>
      {children}
      {needsOnboarding && showOnboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </>
  );
};

export default OnboardingProvider;