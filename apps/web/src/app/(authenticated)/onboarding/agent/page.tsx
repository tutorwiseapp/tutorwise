'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from '../page.module.css';

/**
 * Smart Router for Agent Onboarding
 *
 * This page redirects to the appropriate onboarding step based on:
 * 1. User authentication status
 * 2. Completion status of previous steps
 * 3. Whether user already has agent role
 */
function AgentOnboardingPageContent() {
  const router = useRouter();
  const { user, profile, isLoading, availableRoles } = useUserProfile();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/agent');
      return;
    }

    // Redirect to dashboard if user already has the agent role AND completed onboarding
    if (!isLoading && profile && availableRoles?.includes('agent') &&
        profile.onboarding_progress?.onboarding_completed) {
      console.log('[AgentOnboarding] User already completed agent onboarding, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    // Determine first incomplete step and redirect
    if (!isLoading && profile) {
      // Check personal info - must have completed flag set (only set when Next button clicked)
      // Auto-save preserves draft in onboarding_progress, but completion requires explicit Next click
      const personalInfoComplete = profile.onboarding_progress?.agent?.personalInfo?.completed === true;

      if (!personalInfoComplete) {
        router.push('/onboarding/agent/personal-info');
        return;
      }

      // Check professional details - must have completed flag
      const professionalDetailsComplete = profile.onboarding_progress?.agent?.professionalDetails?.completed === true;

      if (!professionalDetailsComplete) {
        router.push('/onboarding/agent/professional-details');
        return;
      }

      // Check verification - must have completed flag (optional but we route through it)
      const verificationComplete = profile.onboarding_progress?.agent?.verification?.completed === true;

      if (!verificationComplete) {
        router.push('/onboarding/agent/verification');
        return;
      }

      // Check availability - must have completed flag
      const availabilityComplete = profile.onboarding_progress?.agent?.availability?.completed === true;

      if (!availabilityComplete) {
        router.push('/onboarding/agent/availability');
        return;
      }

      // All steps completed but no role yet - go to availability to complete
      router.push('/onboarding/agent/availability');
    }
  }, [user, profile, isLoading, availableRoles, router]);

  // Show loading state while determining redirect
  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading agent onboarding...</p>
    </div>
  );
}

export default function AgentOnboardingPage() {
  return (
    <Suspense fallback={
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    }>
      <AgentOnboardingPageContent />
    </Suspense>
  );
}
