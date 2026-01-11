'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import AgentProfessionalVerificationStep from '@/app/components/feature/onboarding/agent/steps/AgentProfessionalVerificationStep';
import { VerificationDetailsData } from '@/types';
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

export default function AgentVerificationPage() {
  const router = useRouter();
  const { user, profile, isLoading, updateOnboardingProgress } = useUserProfile();
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/agent/verification');
      return;
    }

    // Redirect if previous steps not completed
    if (!isLoading && profile) {
      if (!profile.first_name) {
        router.push('/onboarding/agent/personal-info');
        return;
      }
      if (!profile.onboarding_progress?.agent?.professionalDetails) {
        router.push('/onboarding/agent/professional-details');
        return;
      }
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
    currentStepPoints: STEP_POINTS.verification,
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
        current: true,
      },
      {
        name: 'Availability',
        points: STEP_POINTS.availability,
        completed: completedSteps.has('availability'),
        current: false,
      },
    ],
  };

  const handleNext = async (data: VerificationDetailsData) => {
    console.log('[AgentVerification] handleNext called', data);
    setIsPageLoading(true);

    try {
      // Check if user has actual verification data
      const hasVerificationData =
        data.proof_of_address_url ||
        data.proof_of_address_type ||
        data.identity_verification_document_url ||
        data.identity_document_number ||
        data.dbs_certificate_url ||
        data.dbs_certificate_number;

      if (hasVerificationData) {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();

        // Save to profiles table
        const { error } = await supabase
          .from('profiles')
          .update({
            proof_of_address_url: data.proof_of_address_url,
            proof_of_address_type: data.proof_of_address_type,
            address_document_issue_date: data.address_document_issue_date,
            identity_verification_document_url: data.identity_verification_document_url,
            identity_document_number: data.identity_document_number,
            identity_issue_date: data.identity_issue_date,
            identity_expiry_date: data.identity_expiry_date,
            dbs_certificate_url: data.dbs_certificate_url,
            dbs_certificate_number: data.dbs_certificate_number,
            dbs_certificate_date: data.dbs_certificate_date,
            dbs_expiry_date: data.dbs_expiry_date,
          })
          .eq('id', user.id);

        if (error) throw error;
        console.log('[AgentVerification] ✓ Saved verification data to profiles');

        // Write-through to role_details table
        // Fetch existing role_details to preserve other data
        const { data: existingRoleDetails } = await supabase
          .from('role_details')
          .select('*')
          .eq('profile_id', user.id)
          .eq('role_type', 'tutor')
          .single();

        console.log('[AgentVerification] Existing role_details:', existingRoleDetails);

        // Build verification certifications array
        const verificationCerts = [];
        if (data.dbs_certificate_url && data.dbs_certificate_number) {
          verificationCerts.push({
            type: 'dbs',
            url: data.dbs_certificate_url,
            number: data.dbs_certificate_number,
            issue_date: data.dbs_certificate_date,
            expiry_date: data.dbs_expiry_date,
          });
        }

        // Update role_details with verification data
        const updatedQualifications = {
          ...(existingRoleDetails?.qualifications || {}),
          verification: {
            proof_of_address: {
              url: data.proof_of_address_url,
              type: data.proof_of_address_type,
              issue_date: data.address_document_issue_date,
            },
            identity: {
              url: data.identity_verification_document_url,
              number: data.identity_document_number,
              issue_date: data.identity_issue_date,
              expiry_date: data.identity_expiry_date,
            },
            certifications: verificationCerts,
          },
        };

        const roleDetailsData = {
          profile_id: user.id,
          role_type: 'tutor',
          ...(existingRoleDetails?.subjects && { subjects: existingRoleDetails.subjects }),
          ...(existingRoleDetails?.hourly_rate && { hourly_rate: existingRoleDetails.hourly_rate }),
          ...(existingRoleDetails?.availability && { availability: existingRoleDetails.availability }),
          qualifications: updatedQualifications,
          updated_at: new Date().toISOString(),
        };

        const { error: roleDetailsError } = await supabase
          .from('role_details')
          .upsert(roleDetailsData, {
            onConflict: 'profile_id,role_type'
          });

        if (roleDetailsError) throw roleDetailsError;
        console.log('[AgentVerification] ✓ Saved verification to role_details');
      } else {
        console.log('[AgentVerification] ⏩ No verification data, skipping save');
      }

      // Mark step as completed in onboarding progress with completion flag
      await updateOnboardingProgress({
        current_step: 'availability',
        agent: {
          verification: {
            ...data,
            completed: true  // Completion flag - step is fully done
          }
        }
      });

      console.log('[AgentVerification] ✓ Step marked as completed');

      // Navigate to next step
      router.push('/onboarding/agent/availability');
    } catch (error) {
      console.error('[AgentVerification] Error:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/onboarding/agent/professional-details');
  };

  return (
    <div className={styles.onboardingPage}>
      <AgentProfessionalVerificationStep
        onNext={handleNext}
        onBack={handleBack}
        isLoading={isPageLoading}
        profileId={user.id}
        progressData={progressData}
      />
    </div>
  );
}
