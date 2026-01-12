'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import AgentAvailabilityStep from '@/app/components/feature/onboarding/agent/steps/AgentAvailabilityStep';
import { AvailabilityData } from '@/app/components/feature/onboarding/agent/steps/AgentAvailabilityStep';
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

export default function AgentAvailabilityPage() {
  const router = useRouter();
  const { user, profile, isLoading, updateOnboardingProgress, refreshProfile, setActiveRole } = useUserProfile();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/agent/availability');
      return;
    }

    // Redirect if previous steps not completed
    if (!isLoading && profile && !isCompleting) {
      if (!profile.first_name) {
        router.push('/onboarding/agent/personal-info');
        return;
      }
      if (!profile.onboarding_progress?.agent?.professionalDetails) {
        router.push('/onboarding/agent/professional-details');
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
  if (profile?.onboarding_progress?.agent?.professionalDetails) {
    completedSteps.add('professionalDetails');
  }
  if (profile?.onboarding_progress?.agent?.verification) {
    completedSteps.add('verification');
  }
  if (profile?.onboarding_progress?.agent?.availability) {
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
    console.log('[AgentAvailability] ========================================');
    console.log('[AgentAvailability] handleNext START');
    console.log('[AgentAvailability] Input data:', JSON.stringify(data, null, 2));

    setIsPageLoading(true);
    setIsCompleting(true); // Prevent redirect loop

    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      const professionalDetails = profile?.onboarding_progress?.agent?.professionalDetails;

      // Validate previous steps' data exists before final save
      if (!professionalDetails?.subjects?.length ||
          !professionalDetails?.tutoringExperience ||
          !professionalDetails?.oneOnOneRate) {
        console.error('[AgentAvailability] ❌ Missing professional details data');
        alert('Please complete Professional Details step first. Missing required fields: subjects, experience, or rate.');
        setIsPageLoading(false);
        setIsCompleting(false);
        router.push('/onboarding/agent/professional-details');
        return;
      }

      // Add 'agent' role to user's roles if not already present
      const currentRoles = profile?.roles || [];
      console.log('[AgentAvailability] Current roles:', currentRoles);

      if (!currentRoles.includes('agent')) {
        console.log('[AgentAvailability] Adding agent role...');
        const updatedRoles = [...currentRoles, 'agent'];

        const { data, error: roleError, count } = await supabase
          .from('profiles')
          .update({
            roles: updatedRoles,
            active_role: 'agent'
          })
          .eq('id', user.id)
          .select();

        console.log('[AgentAvailability] Update response:', { data, error: roleError, count });

        if (roleError) {
          console.error('[AgentAvailability] ❌ Role update error:', roleError);
          throw roleError;
        }

        if (!data || data.length === 0) {
          const errorMsg = 'Role update failed - no rows affected. This may be an RLS policy issue.';
          console.error('[AgentAvailability] ❌', errorMsg);
          throw new Error(errorMsg);
        }

        console.log('[AgentAvailability] ✓ Agent role added');
      }

      // Save to role_details table
      console.log('[AgentAvailability] Saving to role_details...');
      const roleDetailsData = {
        profile_id: user.id,
        role_type: 'agent',
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

      const { data: roleDetailsResult, error: roleDetailsError } = await supabase
        .from('role_details')
        .upsert(roleDetailsData, {
          onConflict: 'profile_id,role_type'
        })
        .select();

      console.log('[AgentAvailability] role_details response:', { data: roleDetailsResult, error: roleDetailsError });

      if (roleDetailsError) {
        console.error('[AgentAvailability] ❌ role_details save error:', roleDetailsError);
        throw roleDetailsError;
      }

      if (!roleDetailsResult || roleDetailsResult.length === 0) {
        const errorMsg = 'role_details save failed - no rows affected.';
        console.error('[AgentAvailability] ❌', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[AgentAvailability] ✓ Saved to role_details');

      // Update onboarding progress with completion flag
      await updateOnboardingProgress({
        current_step: 'completion',
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
        agent: {
          professionalDetails,
          availability: {
            ...data,
            completed: true  // Completion flag - step is fully done
          }
        }
      });

      console.log('[AgentAvailability] ✓ Onboarding completed');

      // Trigger IMMEDIATE CaaS calculation to award provisional onboarding points
      // This ensures the dashboard shows the score right away (not 0/100)
      console.log('[AgentAvailability] Calculating CaaS score...');
      try {
        const response = await fetch('/api/caas/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('[AgentAvailability] ❌ CaaS calculation failed:', response.status);
          // Non-blocking - continue to dashboard even if calculation fails
        } else {
          const result = await response.json();
          console.log('[AgentAvailability] ✓ CaaS score calculated:', result.data?.total_score);
        }
      } catch (error) {
        console.error('[AgentAvailability] ❌ CaaS calculation error:', error);
        // Non-blocking error - continue to dashboard
      }

      // Refresh profile and redirect - wait for refresh to complete
      console.log('[AgentAvailability] Refreshing profile...');
      try {
        await Promise.race([
          refreshProfile(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        console.log('[AgentAvailability] ✓ Profile refreshed successfully');
      } catch (error) {
        console.error('[AgentAvailability] ❌ Profile refresh failed:', error);
        // Don't proceed if refresh fails - user may see stale data
        alert('Onboarding completed but profile refresh failed. Please reload the page.');
        setIsPageLoading(false);
        setIsCompleting(false);
        return;
      }

      setActiveRole('agent');
      router.push('/dashboard');
    } catch (error) {
      console.error('[AgentAvailability] ❌ Error:', error);
      alert('Failed to complete onboarding. Please try again.');
      setIsCompleting(false);
    } finally {
      setIsPageLoading(false);
    }

    console.log('[AgentAvailability] handleNext COMPLETE');
    console.log('[AgentAvailability] ========================================');
  };

  const handleBack = () => {
    router.push('/onboarding/agent/verification');
  };

  return (
    <div className={styles.onboardingStepPage}>
      <AgentAvailabilityStep
        onNext={handleNext}
        onBack={handleBack}
        isLoading={isPageLoading}
        progressData={progressData}
      />
    </div>
  );
}
