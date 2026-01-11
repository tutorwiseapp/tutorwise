'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import TutorProfessionalDetailStep from '@/app/components/feature/onboarding/tutor/TutorProfessionalDetailStep';
import { ProfessionalDetailsData } from '@/types';
import styles from '../../page.module.css';

// CaaS Points
const STEP_POINTS = {
  personalInfo: 15,
  professionalDetails: 20,
  verification: 10,
  availability: 10,
} as const;

const REQUIRED_POINTS = 45;
const TOTAL_POINTS = 55;

export default function TutorProfessionalDetailsPage() {
  const router = useRouter();
  const { user, profile, isLoading, updateOnboardingProgress } = useUserProfile();
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/tutor/professional-details');
      return;
    }

    // Redirect to first step if personal info not completed
    if (!isLoading && profile && !profile.first_name) {
      router.push('/onboarding/tutor/personal-info');
      return;
    }
  }, [user, profile, isLoading, router]);

  // Show loading state
  if (isLoading || !user) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Calculate progress
  const completedSteps = new Set<string>();
  if (profile?.first_name) completedSteps.add('personalInfo');
  if (profile?.onboarding_progress?.tutor?.professionalDetails) {
    completedSteps.add('professionalDetails');
  }
  if (profile?.onboarding_progress?.tutor?.verification) {
    completedSteps.add('verification');
  }
  if (profile?.onboarding_progress?.tutor?.availability) {
    completedSteps.add('availability');
  }

  const currentPoints = Array.from(completedSteps).reduce(
    (sum, step) => sum + (STEP_POINTS[step as keyof typeof STEP_POINTS] || 0),
    0
  );

  const progressData = {
    currentPoints,
    totalPoints: TOTAL_POINTS,
    currentStepPoints: STEP_POINTS.professionalDetails,
    requiredPoints: REQUIRED_POINTS,
    steps: [
      {
        name: 'Personal Info',
        points: STEP_POINTS.personalInfo,
        completed: completedSteps.has('personalInfo'),
        current: false,
      },
      {
        name: 'Professional Details',
        points: STEP_POINTS.professionalDetails,
        completed: completedSteps.has('professionalDetails'),
        current: true,
      },
      {
        name: 'Verification',
        points: STEP_POINTS.verification,
        completed: completedSteps.has('verification'),
        current: false,
      },
      {
        name: 'Availability',
        points: STEP_POINTS.availability,
        completed: completedSteps.has('availability'),
        current: false,
      },
    ],
  };

  const handleNext = async (data: ProfessionalDetailsData) => {
    console.log('[TutorProfessionalDetails] handleNext called', data);
    setIsPageLoading(true);

    try {
      // Save to onboarding_progress
      await updateOnboardingProgress({
        current_step: 'verification',
        tutor: { professionalDetails: data }
      });

      console.log('[TutorProfessionalDetails] ✓ Saved progress');

      // Navigate to next step
      router.push('/onboarding/tutor/verification');
    } catch (error) {
      console.error('[TutorProfessionalDetails] Error:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/onboarding/tutor/personal-info');
  };

  return (
    <div className={styles.onboardingPage}>
      <TutorProfessionalDetailStep
        onNext={handleNext}
        onBack={handleBack}
        isLoading={isPageLoading}
        progressData={progressData}
      />
    </div>
  );
}
