'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from '../page.module.css';

/**
 * Smart Router for Tutor Onboarding
 *
 * This page redirects to the appropriate onboarding step based on:
 * 1. User authentication status
 * 2. Completion status of previous steps
 * 3. Whether user already has tutor role
 */
function TutorOnboardingPageContent() {
  const router = useRouter();
  const { user, profile, isLoading, availableRoles } = useUserProfile();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/tutor');
      return;
    }

    // Redirect to dashboard if user already has the tutor role AND completed onboarding
    if (!isLoading && profile && availableRoles?.includes('tutor') &&
        profile.onboarding_progress?.onboarding_completed) {
      console.log('[TutorOnboarding] User already completed tutor onboarding, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    // Determine first incomplete step and redirect
    if (!isLoading && profile) {
      // Check personal info - must be present in profiles table (first_name is saved on Next button)
      // Note: onboarding_progress may have auto-saved data, but we check profiles table for step completion
      if (!profile.first_name) {
        router.push('/onboarding/tutor/personal-info');
        return;
      }

      // Check professional details
      if (!profile.onboarding_progress?.tutor?.professionalDetails) {
        router.push('/onboarding/tutor/professional-details');
        return;
      }

      // Check verification (optional but we route through it)
      if (!profile.onboarding_progress?.tutor?.verification) {
        router.push('/onboarding/tutor/verification');
        return;
      }

      // Check availability
      if (!profile.onboarding_progress?.tutor?.availability) {
        router.push('/onboarding/tutor/availability');
        return;
      }

      // All steps completed but no role yet - go to availability to complete
      router.push('/onboarding/tutor/availability');
    }
  }, [user, profile, isLoading, availableRoles, router]);

  // Show loading state while determining redirect
  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading tutor onboarding...</p>
    </div>
  );
}

export default function TutorOnboardingPage() {
  return (
    <Suspense fallback={
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    }>
      <TutorOnboardingPageContent />
    </Suspense>
  );
}
