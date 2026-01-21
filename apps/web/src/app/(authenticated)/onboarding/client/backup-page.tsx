'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ClientOnboardingWizard from '@/app/components/feature/onboarding/client/ClientOnboardingWizard';
import styles from './page.module.css';

export default function ClientOnboardingPage() {
  const router = useRouter();
  const { user, profile, isLoading, availableRoles, refreshProfile, setActiveRole } = useUserProfile();
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/client');
      return;
    }

    // Redirect to dashboard if user already has the client role
    // BUT NOT during the completion process (prevents race condition)
    if (!isLoading && profile && availableRoles.includes('client') && !isCompleting) {
      console.log('[ClientOnboardingPage] User already has client role, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [user, profile, isLoading, availableRoles, router, isCompleting]);

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
    console.log('[ClientOnboardingPage] Onboarding complete!');
    setIsCompleting(true); // Prevent race condition with useEffect redirect

    try {
      console.log('[ClientOnboardingPage] Refreshing profile...');
      await Promise.race([
        refreshProfile(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile refresh timeout')), 3000))
      ]);
      console.log('[ClientOnboardingPage] Profile refreshed successfully');
    } catch (error) {
      console.error('[ClientOnboardingPage] Profile refresh failed or timed out:', error);
      // Continue anyway - the profile will refresh on dashboard load
    }

    console.log('[ClientOnboardingPage] Setting active role to client...');
    setActiveRole('client');
    console.log('[ClientOnboardingPage] Active role set, redirecting to dashboard...');
    router.push('/dashboard');
  };

  const handleOnboardingSkip = async () => {
    console.log('[ClientOnboardingPage] Onboarding skipped');
    setIsCompleting(true);

    try {
      console.log('[ClientOnboardingPage] Refreshing profile...');
      await Promise.race([
        refreshProfile(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile refresh timeout')), 3000))
      ]);
      console.log('[ClientOnboardingPage] Profile refreshed successfully');
    } catch (error) {
      console.error('[ClientOnboardingPage] Profile refresh failed or timed out:', error);
      // Continue anyway - the profile will refresh on dashboard load
    }

    console.log('[ClientOnboardingPage] Setting active role to client...');
    setActiveRole('client');
    console.log('[ClientOnboardingPage] Active role set, redirecting to dashboard...');
    router.push('/dashboard');
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