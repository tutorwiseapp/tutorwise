'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import TutorOnboardingWizard from '@/app/components/feature/onboarding/tutor/TutorOnboardingWizard';
import styles from '../page.module.css';

function TutorOnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading, availableRoles, refreshProfile, setActiveRole } = useUserProfile();
  const [isCompleting, setIsCompleting] = useState(false);

  // Get step from URL parameters for auto-resume functionality
  const resumeStep = searchParams?.get('step');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/tutor');
      return;
    }

    // Redirect to dashboard if user already has the tutor role
    // BUT NOT during the completion process (prevents race condition)
    if (!isLoading && profile && availableRoles?.includes('tutor') && !isCompleting) {
      console.log('[TutorOnboardingPage] User already has tutor role, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [user, profile, isLoading, availableRoles, router, isCompleting]);

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
    setIsCompleting(true); // Prevent race condition with useEffect redirect

    try {
      console.log('[TutorOnboarding] Refreshing profile...');
      await Promise.race([
        refreshProfile(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile refresh timeout')), 3000))
      ]);
      console.log('[TutorOnboarding] Profile refreshed successfully');
    } catch (error) {
      console.error('[TutorOnboarding] Profile refresh failed or timed out:', error);
      // Continue anyway - the profile will refresh on dashboard load
    }

    console.log('[TutorOnboarding] Setting active role to tutor...');
    setActiveRole('tutor');
    console.log('[TutorOnboarding] Active role set, redirecting to dashboard...');
    router.push('/dashboard');
  };

  const handleOnboardingSkip = async () => {
    console.log('[TutorOnboarding] Onboarding skipped');
    setIsCompleting(true);

    try {
      console.log('[TutorOnboarding] Refreshing profile...');
      await Promise.race([
        refreshProfile(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile refresh timeout')), 3000))
      ]);
      console.log('[TutorOnboarding] Profile refreshed successfully');
    } catch (error) {
      console.error('[TutorOnboarding] Profile refresh failed or timed out:', error);
      // Continue anyway - the profile will refresh on dashboard load
    }

    console.log('[TutorOnboarding] Setting active role to tutor...');
    setActiveRole('tutor');
    console.log('[TutorOnboarding] Active role set, redirecting to dashboard...');
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
