'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import OnboardingWizard from '@/app/components/onboarding/OnboardingWizard';
import styles from './page.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading, needsOnboarding } = useUserProfile();

  // Get step from URL parameters for auto-resume functionality
  const resumeStep = searchParams?.get('step');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding');
      return;
    }

    // Redirect to dashboard if onboarding is already complete
    if (!isLoading && profile && !needsOnboarding) {
      router.push('/dashboard');
      return;
    }
  }, [user, profile, isLoading, needsOnboarding, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  // Don't render onboarding if user is not authenticated
  if (!user) {
    return null;
  }

  const handleOnboardingComplete = () => {
    router.push('/dashboard');
  };

  const handleOnboardingSkip = () => {
    router.push('/dashboard');
  };

  return (
    <div className={styles.onboardingPage}>
      <OnboardingWizard
        mode="fullPage"
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        initialStep={resumeStep || undefined}
      />
    </div>
  );
}