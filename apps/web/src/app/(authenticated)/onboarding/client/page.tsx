'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from '../page.module.css';

/**
 * Smart Router for Client Onboarding
 *
 * This page redirects to the appropriate onboarding step based on:
 * 1. User authentication status
 * 2. Completion status of previous steps
 * 3. Whether user already has client role
 */
function ClientOnboardingPageContent() {
  const router = useRouter();
  const { user, profile, isLoading, availableRoles } = useUserProfile();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/client');
      return;
    }

    // Redirect to dashboard if user already has the client role AND completed onboarding
    if (!isLoading && profile && availableRoles?.includes('client') &&
        profile.onboarding_progress?.onboarding_completed) {
      console.log('[ClientOnboarding] User already completed client onboarding, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    // Determine first incomplete step and redirect
    if (!isLoading && profile) {
      // Check personal info - must have completed flag set (only set when Next button clicked)
      // Auto-save preserves draft in onboarding_progress, but completion requires explicit Next click
      const personalInfoComplete = profile.onboarding_progress?.client?.personalInfo?.completed === true;

      if (!personalInfoComplete) {
        router.push('/onboarding/client/personal-info');
        return;
      }

      // Check professional details - must have completed flag
      const professionalDetailsComplete = profile.onboarding_progress?.client?.professionalDetails?.completed === true;

      if (!professionalDetailsComplete) {
        router.push('/onboarding/client/professional-details');
        return;
      }

      // Check verification - must have completed flag (optional but we route through it)
      const verificationComplete = profile.onboarding_progress?.client?.verification?.completed === true;

      if (!verificationComplete) {
        router.push('/onboarding/client/verification');
        return;
      }

      // Check availability - must have completed flag
      const availabilityComplete = profile.onboarding_progress?.client?.availability?.completed === true;

      if (!availabilityComplete) {
        router.push('/onboarding/client/availability');
        return;
      }

      // All steps completed but no role yet - go to availability to complete
      router.push('/onboarding/client/availability');
    }
  }, [user, profile, isLoading, availableRoles, router]);

  // Show loading state while determining redirect
  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading client onboarding...</p>
    </div>
  );
}

export default function ClientOnboardingPage() {
  return (
    <Suspense fallback={
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    }>
      <ClientOnboardingPageContent />
    </Suspense>
  );
}
