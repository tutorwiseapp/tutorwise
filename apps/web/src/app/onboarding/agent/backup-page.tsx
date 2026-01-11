'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import AgentOnboardingWizard from '@/app/components/feature/onboarding/agent/AgentOnboardingWizard';
import styles from '../page.module.css';

function AgentOnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading, availableRoles, refreshProfile, setActiveRole } = useUserProfile();
  const [isCompleting, setIsCompleting] = useState(false);

  // Get step from URL parameters for auto-resume functionality
  const resumeStep = searchParams?.get('step');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/agent');
      return;
    }

    // Redirect to dashboard if user already has agent role
    // BUT NOT during the completion process (prevents race condition)
    if (!isLoading && profile && availableRoles?.includes('agent') && !isCompleting) {
      console.log('[AgentOnboardingPage] User already has agent role, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [user, profile, isLoading, availableRoles, router, isCompleting]);

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
    console.log('[AgentOnboarding] Onboarding complete!');
    setIsCompleting(true); // Prevent race condition with useEffect redirect

    try {
      console.log('[AgentOnboarding] Refreshing profile...');
      await Promise.race([
        refreshProfile(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile refresh timeout')), 3000))
      ]);
      console.log('[AgentOnboarding] Profile refreshed successfully');
    } catch (error) {
      console.error('[AgentOnboarding] Profile refresh failed or timed out:', error);
      // Continue anyway - the profile will refresh on dashboard load
    }

    console.log('[AgentOnboarding] Setting active role to agent...');
    setActiveRole('agent');
    console.log('[AgentOnboarding] Active role set, redirecting to dashboard...');
    router.push('/dashboard');
  };

  const handleOnboardingSkip = async () => {
    console.log('[AgentOnboarding] Onboarding skipped');
    setIsCompleting(true);

    try {
      console.log('[AgentOnboarding] Refreshing profile...');
      await Promise.race([
        refreshProfile(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile refresh timeout')), 3000))
      ]);
      console.log('[AgentOnboarding] Profile refreshed successfully');
    } catch (error) {
      console.error('[AgentOnboarding] Profile refresh failed or timed out:', error);
      // Continue anyway - the profile will refresh on dashboard load
    }

    console.log('[AgentOnboarding] Setting active role to agent...');
    setActiveRole('agent');
    console.log('[AgentOnboarding] Active role set, redirecting to dashboard...');
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
