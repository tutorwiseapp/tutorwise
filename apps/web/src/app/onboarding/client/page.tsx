'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ClientOnboardingWizard from '@/app/components/onboarding/client/ClientOnboardingWizard';
import styles from './page.module.css';

export default function ClientOnboardingPage() {
  const router = useRouter();
  const { user, profile, isLoading, availableRoles, refreshProfile, setActiveRole } = useUserProfile();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/client');
      return;
    }

    // Redirect to dashboard if user already has the seeker role
    if (!isLoading && profile && availableRoles.includes('client')) {
      console.log('[ClientOnboardingPage] User already has seeker role, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [user, profile, isLoading, availableRoles, router]);

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

  const handleOnboardingComplete = async () => {
    console.log('[ClientOnboardingPage] Onboarding complete, refreshing profile...');
    await refreshProfile();
    console.log('[ClientOnboardingPage] Profile refreshed, setting active role to seeker...');
    setActiveRole('client');
    console.log('[ClientOnboardingPage] Active role set, redirecting to account settings...');
    router.push('/account/personal-info');
  };

  const handleOnboardingSkip = async () => {
    console.log('[ClientOnboardingPage] Onboarding skipped, refreshing profile...');
    await refreshProfile();
    console.log('[ClientOnboardingPage] Profile refreshed, setting active role to seeker...');
    setActiveRole('client');
    console.log('[ClientOnboardingPage] Active role set, redirecting to account settings...');
    router.push('/account/personal-info');
  };

  return (
    <div className={styles.onboardingPage}>
      <ClientOnboardingWizard
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </div>
  );
}