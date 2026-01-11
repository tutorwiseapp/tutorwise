'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import TutorAvailabilityStep from '@/app/components/feature/onboarding/tutor/TutorAvailabilityStep';
import { AvailabilityData } from '@/app/components/feature/onboarding/tutor/TutorAvailabilityStep';
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

export default function TutorAvailabilityPage() {
  const router = useRouter();
  const { user, profile, isLoading, updateOnboardingProgress, refreshProfile, setActiveRole } = useUserProfile();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/tutor/availability');
      return;
    }

    // Redirect if previous steps not completed
    if (!isLoading && profile && !isCompleting) {
      if (!profile.first_name) {
        router.push('/onboarding/tutor/personal-info');
        return;
      }
      if (!profile.onboarding_progress?.tutor?.professionalDetails) {
        router.push('/onboarding/tutor/professional-details');
        return;
      }
    }
  }, [user, profile, isLoading, isCompleting, router]);

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
    currentStepPoints: STEP_POINTS.availability,
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
        current: true,
      },
    ],
  };

  const handleNext = async (data: AvailabilityData) => {
    console.log('[TutorAvailability] ========================================');
    console.log('[TutorAvailability] handleNext START');
    console.log('[TutorAvailability] Input data:', JSON.stringify(data, null, 2));

    setIsPageLoading(true);
    setIsCompleting(true); // Prevent redirect loop

    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      const professionalDetails = profile?.onboarding_progress?.tutor?.professionalDetails;

      // Add 'tutor' role to user's roles if not already present
      const currentRoles = profile?.roles || [];
      console.log('[TutorAvailability] Current roles:', currentRoles);

      if (!currentRoles.includes('tutor')) {
        console.log('[TutorAvailability] Adding tutor role...');
        const updatedRoles = [...currentRoles, 'tutor'];

        const { error: roleError } = await supabase
          .from('profiles')
          .update({
            roles: updatedRoles,
            active_role: 'tutor'
          })
          .eq('id', user.id);

        if (roleError) throw roleError;
        console.log('[TutorAvailability] ✓ Tutor role added');
      }

      // Save to role_details table
      console.log('[TutorAvailability] Saving to role_details...');
      const roleDetailsData = {
        profile_id: user.id,
        role_type: 'tutor',
        subjects: professionalDetails?.subjects || [],
        qualifications: {
          experience_level: professionalDetails?.tutoringExperience || '',
          education: professionalDetails?.academicQualifications?.[0] || '',
          certifications: professionalDetails?.teachingProfessionalQualifications || [],
          bio: professionalDetails?.bio || '',
        },
        hourly_rate: professionalDetails?.oneOnOneRate || 0,
        availability: {
          general_days: data.generalDays || [],
          general_times: data.generalTimes || [],
          availability_periods: data.availabilityPeriods || [],
          unavailability_periods: data.unavailabilityPeriods || [],
        },
        completed_at: new Date().toISOString(),
      };

      const { error: roleDetailsError } = await supabase
        .from('role_details')
        .upsert(roleDetailsData, {
          onConflict: 'profile_id,role_type'
        });

      if (roleDetailsError) throw roleDetailsError;
      console.log('[TutorAvailability] ✓ Saved to role_details');

      // Update onboarding progress with completion flag
      await updateOnboardingProgress({
        current_step: 'completion',
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
        tutor: {
          professionalDetails,
          availability: {
            ...data,
            completed: true  // Completion flag - step is fully done
          }
        }
      });

      console.log('[TutorAvailability] ✓ Onboarding completed');

      // Refresh profile and redirect
      try {
        await Promise.race([
          refreshProfile(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
      } catch (error) {
        console.error('[TutorAvailability] Profile refresh timeout:', error);
      }

      setActiveRole('tutor');
      router.push('/dashboard');
    } catch (error) {
      console.error('[TutorAvailability] ❌ Error:', error);
      alert('Failed to complete onboarding. Please try again.');
      setIsCompleting(false);
    } finally {
      setIsPageLoading(false);
    }

    console.log('[TutorAvailability] handleNext COMPLETE');
    console.log('[TutorAvailability] ========================================');
  };

  const handleBack = () => {
    router.push('/onboarding/tutor/verification');
  };

  return (
    <div className={styles.onboardingPage}>
      <TutorAvailabilityStep
        onNext={handleNext}
        onBack={handleBack}
        isLoading={isPageLoading}
        progressData={progressData}
      />
    </div>
  );
}
