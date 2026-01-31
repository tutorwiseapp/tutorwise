'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import PersonalInfoStep, { PersonalInfoData } from '@/app/components/feature/onboarding/shared/steps/PersonalInfoStep';
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

export default function TutorPersonalInfoPage() {
  const router = useRouter();
  const { user, profile, isLoading, updateOnboardingProgress } = useUserProfile();
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/tutor/personal-info');
      return;
    }
  }, [user, isLoading, router]);

  // Show loading state
  if (isLoading || !user) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Calculate progress for badge
  const completedSteps = new Set<string>();
  // Check which steps are completed from saved progress
  if (profile?.onboarding_progress?.tutor?.personalInfo) {
    completedSteps.add('personalInfo');
  }
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
    currentStepPoints: STEP_POINTS.personalInfo,
    requiredPoints: REQUIRED_POINTS,
    steps: [
      {
        name: 'Personal Info',
        points: STEP_POINTS.personalInfo,
        completed: completedSteps.has('personalInfo'),
        current: true,
      },
      {
        name: 'Professional Details',
        points: STEP_POINTS.professionalDetails,
        completed: completedSteps.has('professionalDetails'),
        current: false,
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

  const handleNext = async (data: PersonalInfoData) => {
    console.log('[TutorPersonalInfo] handleNext called', data);
    setIsPageLoading(true);

    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      const fullName = `${data.firstName} ${data.lastName}`.trim();

      // Write ALL personal info fields to profiles table atomically
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: fullName,
          email: data.email,
          phone: data.phone,
          gender: data.gender,
          date_of_birth: data.dateOfBirth,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('[TutorPersonalInfo] Error saving to profiles:', profileError);
        throw profileError;
      }

      console.log('[TutorPersonalInfo] ✓ Saved all fields to profiles table');

      // Mark step as completed in onboarding_progress with completion flag
      await updateOnboardingProgress({
        current_step: 'professionalDetails',
        tutor: {
          personalInfo: {
            ...data,
            completed: true,  // Completion flag - step is fully done
          }
        }
      });

      console.log('[TutorPersonalInfo] ✓ Step marked as completed');

      // Navigate to next step
      router.push('/onboarding/tutor/professional-details');
    } catch (error) {
      console.error('[TutorPersonalInfo] Error:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/onboarding');
  };

  return (
    <div className={styles.onboardingStepPage}>
      <PersonalInfoStep
        role="tutor"
        onNext={handleNext}
        onBack={handleBack}
        isLoading={isPageLoading}
        progressData={progressData}
      />
    </div>
  );
}
