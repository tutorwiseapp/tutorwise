'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import TutorOnboardingWizard from '@/app/components/onboarding/tutor/TutorOnboardingWizard';
import styles from '../page.module.css';

function TutorOnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading, availableRoles, refreshProfile } = useUserProfile();

  // Get step from URL parameters for auto-resume functionality
  const resumeStep = searchParams?.get('step');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/tutor');
      return;
    }

    // Redirect to dashboard if user already has the provider role
    if (!isLoading && profile && availableRoles?.includes('provider')) {
      console.log('[TutorOnboardingPage] User already has provider role, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [user, profile, isLoading, availableRoles, router]);

  // Handle browser back button to prevent auth flow state issues
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If user is authenticated and on tutor onboarding, prevent default back behavior
      if (user) {
        event.preventDefault();
        // Instead, use the onboarding wizard's built-in back functionality
        console.log('Browser back prevented during tutor onboarding - use wizard Back button instead');
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
    console.log('[TutorOnboarding] Onboarding complete! Database save already finished.');
    console.log('[TutorOnboarding] Refreshing profile...');
    await refreshProfile();
    console.log('[TutorOnboarding] Profile refreshed, redirecting to dashboard...');
    // Use Next.js router for proper client-side navigation (preserves session)
    router.push('/dashboard');
  };

  const handleOnboardingSkip = async () => {
    console.log('[TutorOnboarding] Onboarding skipped, refreshing profile...');
    await refreshProfile();
    console.log('[TutorOnboarding] Profile refreshed, redirecting to dashboard...');
    router.push('/dashboard');
  };

  return (
    <div className={styles.onboardingPage}>
      <TutorOnboardingWizard
        mode="fullPage"
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        initialStep={resumeStep || undefined}
      />
    </div>
  );
}

export default function TutorOnboardingPage() {
  return (
    <Suspense fallback={
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading tutor onboarding...</p>
      </div>
    }>
      <TutorOnboardingPageContent />
    </Suspense>
  );
}
