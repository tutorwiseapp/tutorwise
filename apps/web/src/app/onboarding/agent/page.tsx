'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import AgentOnboardingWizard from '@/app/components/onboarding/agent/AgentOnboardingWizard';
import styles from '../page.module.css';

function AgentOnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading, availableRoles, refreshProfile } = useUserProfile();

  // Get step from URL parameters for auto-resume functionality
  const resumeStep = searchParams?.get('step');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/agent');
      return;
    }

    // Redirect to dashboard if user already has agent role
    if (!isLoading && profile && availableRoles?.includes('agent')) {
      console.log('[AgentOnboardingPage] User already has agent role, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [user, profile, isLoading, availableRoles, router]);

  // Handle browser back button to prevent auth flow state issues
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If user is authenticated and on agent onboarding, prevent default back behavior
      if (user) {
        event.preventDefault();
        // Instead, use the onboarding wizard's built-in back functionality
        console.log('Browser back prevented during agent onboarding - use wizard Back button instead');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

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
    console.log('[AgentOnboarding] Onboarding complete, refreshing profile...');
    await refreshProfile();
    console.log('[AgentOnboarding] Profile refreshed, redirecting to dashboard...');
    router.push('/dashboard');
  };

  const handleOnboardingSkip = async () => {
    console.log('[AgentOnboarding] Onboarding skipped, refreshing profile...');
    await refreshProfile();
    console.log('[AgentOnboarding] Profile refreshed, redirecting to dashboard...');
    router.push('/dashboard');
  };

  return (
    <div className={styles.onboardingPage}>
      <AgentOnboardingWizard
        mode="fullPage"
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        initialStep={resumeStep || undefined}
      />
    </div>
  );
}

export default function AgentOnboardingPage() {
  return (
    <Suspense fallback={
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading agent onboarding...</p>
      </div>
    }>
      <AgentOnboardingPageContent />
    </Suspense>
  );
}
