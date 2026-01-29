'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ClientAvailabilityStep from '@/app/components/feature/onboarding/client/steps/ClientAvailabilityStep';
import { AvailabilityData } from '@/app/components/feature/onboarding/client/steps/ClientAvailabilityStep';
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

export default function ClientAvailabilityPage() {
  const router = useRouter();
  const { user, profile, isLoading, updateOnboardingProgress, refreshProfile, setActiveRole } = useUserProfile();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/client/availability');
      return;
    }

    // Redirect if previous steps not completed
    if (!isLoading && profile && !isCompleting) {
      if (!profile.first_name) {
        router.push('/onboarding/client/personal-info');
        return;
      }
      if (!profile.onboarding_progress?.client?.professionalDetails) {
        router.push('/onboarding/client/professional-details');
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
  if (profile?.onboarding_progress?.client?.professionalDetails) {
    completedSteps.add('professionalDetails');
  }
  if (profile?.onboarding_progress?.client?.verification) {
    completedSteps.add('verification');
  }
  if (profile?.onboarding_progress?.client?.availability) {
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
    console.log('[ClientAvailability] ========================================');
    console.log('[ClientAvailability] handleNext START');
    console.log('[ClientAvailability] Input data:', JSON.stringify(data, null, 2));

    setIsPageLoading(true);
    setIsCompleting(true); // Prevent redirect loop

    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      const professionalDetails = profile?.onboarding_progress?.client?.professionalDetails;

      // Validate previous steps' data exists before final save
      if (!professionalDetails?.subjects?.length ||
          !professionalDetails?.tutoringExperience ||
          !professionalDetails?.oneOnOneRate) {
        console.error('[ClientAvailability] ❌ Missing professional details data');
        alert('Please complete Professional Details step first. Missing required fields: subjects, experience, or rate.');
        setIsPageLoading(false);
        setIsCompleting(false);
        router.push('/onboarding/client/professional-details');
        return;
      }

      // Add 'client' role to user's roles if not already present
      const currentRoles = profile?.roles || [];
      console.log('[ClientAvailability] Current roles:', currentRoles);

      if (!currentRoles.includes('client')) {
        console.log('[ClientAvailability] Adding client role...');
        const updatedRoles = [...currentRoles, 'client'];

        const { data, error: roleError, count } = await supabase
          .from('profiles')
          .update({
            roles: updatedRoles,
            active_role: 'client'
          })
          .eq('id', user.id)
          .select();

        console.log('[ClientAvailability] Update response:', { data, error: roleError, count });

        if (roleError) {
          console.error('[ClientAvailability] ❌ Role update error:', roleError);
          throw roleError;
        }

        if (!data || data.length === 0) {
          const errorMsg = 'Role update failed - no rows affected. This may be an RLS policy issue.';
          console.error('[ClientAvailability] ❌', errorMsg);
          throw new Error(errorMsg);
        }

        console.log('[ClientAvailability] ✓ Client role added');
      }

      // Fetch existing role_details to preserve all professional details fields
      const { data: existingRoleDetails } = await supabase
        .from('role_details')
        .select('*')
        .eq('profile_id', user.id)
        .eq('role_type', 'client')
        .single();

      console.log('[ClientAvailability] Existing role_details:', existingRoleDetails);

      // Save to role_details table - preserve existing fields, add availability
      console.log('[ClientAvailability] Saving to role_details...');
      const roleDetailsData = {
        // Preserve all existing fields from professional-details step
        ...existingRoleDetails,
        profile_id: user.id,
        role_type: 'client',
        // Add/update availability data
        availability: {
          general_days: data.generalDays || [],
          general_times: data.generalTimes || [],
          availability_periods: data.availabilityPeriods || [],
          unavailability_periods: data.unavailabilityPeriods || [],
        },
        completed_at: new Date().toISOString(),
      };

      const { data: roleDetailsResult, error: roleDetailsError } = await supabase
        .from('role_details')
        .upsert(roleDetailsData, {
          onConflict: 'profile_id,role_type'
        })
        .select();

      console.log('[ClientAvailability] role_details response:', { data: roleDetailsResult, error: roleDetailsError });

      if (roleDetailsError) {
        console.error('[ClientAvailability] ❌ role_details save error:', roleDetailsError);
        throw roleDetailsError;
      }

      if (!roleDetailsResult || roleDetailsResult.length === 0) {
        const errorMsg = 'role_details save failed - no rows affected.';
        console.error('[ClientAvailability] ❌', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[ClientAvailability] ✓ Saved to role_details');

      // Update onboarding progress with completion flag
      await updateOnboardingProgress({
        current_step: 'completion',
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
        client: {
          professionalDetails,
          availability: {
            ...data,
            completed: true  // Completion flag - step is fully done
          }
        }
      });

      console.log('[ClientAvailability] ✓ Onboarding completed');

      // Trigger IMMEDIATE CaaS calculation to award provisional onboarding points
      // This ensures the dashboard shows the score right away (not 0/100)
      console.log('[ClientAvailability] Calculating CaaS score...');
      try {
        const response = await fetch('/api/caas/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('[ClientAvailability] ❌ CaaS calculation failed:', response.status);
          // Non-blocking - continue to dashboard even if calculation fails
        } else {
          const result = await response.json();
          console.log('[ClientAvailability] ✓ CaaS score calculated:', result.data?.total_score);
        }
      } catch (error) {
        console.error('[ClientAvailability] ❌ CaaS calculation error:', error);
        // Non-blocking error - continue to dashboard
      }

      // Refresh profile and redirect - wait for refresh to complete
      console.log('[ClientAvailability] Refreshing profile...');
      try {
        await Promise.race([
          refreshProfile(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        console.log('[ClientAvailability] ✓ Profile refreshed successfully');
      } catch (error) {
        console.error('[ClientAvailability] ❌ Profile refresh failed:', error);
        // Don't proceed if refresh fails - user may see stale data
        alert('Onboarding completed but profile refresh failed. Please reload the page.');
        setIsPageLoading(false);
        setIsCompleting(false);
        return;
      }

      setActiveRole('client');
      router.push('/dashboard');
    } catch (error) {
      console.error('[ClientAvailability] ❌ Error:', error);
      alert('Failed to complete onboarding. Please try again.');
      setIsCompleting(false);
    } finally {
      setIsPageLoading(false);
    }

    console.log('[ClientAvailability] handleNext COMPLETE');
    console.log('[ClientAvailability] ========================================');
  };

  const handleBack = () => {
    router.push('/onboarding/client/verification');
  };

  return (
    <div className={styles.onboardingStepPage}>
      <ClientAvailabilityStep
        onNext={handleNext}
        onBack={handleBack}
        isLoading={isPageLoading}
        progressData={progressData}
      />
    </div>
  );
}
