// apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAutoSaveDraft, loadDraft, clearDraft, saveCurrentStep, loadSavedStep } from '@/lib/utils/wizardUtils';
import TutorWelcomeStep from '@/app/components/feature/onboarding/steps/WelcomeStep';
import TutorPersonalInfoStep from './TutorPersonalInfoStep';
import TutorProfessionalDetailStep from './TutorProfessionalDetailStep';
import TutorProfessionalVerificationStep from './TutorProfessionalVerificationStep';
import TutorAvailabilityStep from './TutorAvailabilityStep';
import { ProfessionalDetailsData, VerificationDetailsData, AvailabilityData } from '@/types';
import styles from '../OnboardingWizard.module.css';

export interface PersonalInfoData {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
}

export type TutorOnboardingStep = 'personalInfo' | 'professionalDetails' | 'verification' | 'availability' | 'completion';

interface TutorOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: string;
}

interface TutorDraftData {
  personalInfo: Partial<PersonalInfoData>;
  professionalDetails: Partial<ProfessionalDetailsData>;
  verification: Partial<VerificationDetailsData>;
  availability: Partial<AvailabilityData>;
}

// CaaS Points for each onboarding step
const STEP_POINTS = {
  personalInfo: 15,
  professionalDetails: 20,
  verification: 10, // Optional
  availability: 10,
} as const;

const REQUIRED_POINTS = 45; // personalInfo + professionalDetails + availability
const TOTAL_POINTS = 55; // includes optional verification

const TutorOnboardingWizard: React.FC<TutorOnboardingWizardProps> = ({
  onComplete,
  onSkip,
  mode = 'fullPage',
  initialStep
}) => {
  const { profile, user, updateOnboardingProgress } = useUserProfile();
  const DRAFT_KEY = 'onboarding_draft_tutor';

  const [currentStep, setCurrentStep] = useState<TutorOnboardingStep>(
    (initialStep as TutorOnboardingStep) || 'personalInfo'
  );
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInfoData>>({});
  const [professionalDetails, setProfessionalDetails] = useState<Partial<ProfessionalDetailsData>>({});
  const [verification, setVerification] = useState<Partial<VerificationDetailsData>>({});
  const [availability, setAvailability] = useState<Partial<AvailabilityData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Track completed steps for progress calculation
  const [completedSteps, setCompletedSteps] = useState<Set<TutorOnboardingStep>>(new Set());

  // Load draft AND saved step from database on mount
  useEffect(() => {
    async function loadSavedDraft() {
      if (!isDraftLoaded) {
        // Load draft data
        const draft = await loadDraft<TutorDraftData>(user?.id, DRAFT_KEY);
        if (draft) {
          if (draft.personalInfo) setPersonalInfo(draft.personalInfo);
          if (draft.professionalDetails) setProfessionalDetails(draft.professionalDetails);
          if (draft.verification) setVerification(draft.verification);
          if (draft.availability) setAvailability(draft.availability);
        }

        // Load saved step (only if not explicitly provided via initialStep prop)
        if (!initialStep) {
          const savedStep = await loadSavedStep(user?.id, DRAFT_KEY);
          if (savedStep && savedStep !== 'completion') {
            console.log('[TutorOnboardingWizard] Restoring saved step:', savedStep);
            setCurrentStep(savedStep as TutorOnboardingStep);
          }
        }

        setIsDraftLoaded(true);
      }
    }
    loadSavedDraft();
  }, [user?.id, isDraftLoaded, initialStep]);

  // Prepare form data for auto-save - memoized to prevent unnecessary re-renders
  const formData = React.useMemo<TutorDraftData>(() => ({
    personalInfo,
    professionalDetails,
    verification,
    availability,
  }), [personalInfo, professionalDetails, verification, availability]);

  // Memoize shouldSave callback to prevent recreation on every render
  const shouldSave = React.useCallback(
    (data: TutorDraftData) => !!data.personalInfo?.firstName || !!data.professionalDetails?.bio,
    []
  );

  // Auto-save draft every 30 seconds (with database sync)
  const { saveDraft } = useAutoSaveDraft<TutorDraftData>(
    user?.id,
    DRAFT_KEY,
    formData,
    shouldSave
  );

  // Save current step whenever it changes
  useEffect(() => {
    if (isDraftLoaded) {
      saveCurrentStep(user?.id, DRAFT_KEY, currentStep);
    }
  }, [user?.id, currentStep, isDraftLoaded]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Calculate progress for InlineProgressBadge
  const getProgressData = React.useMemo(() => {
    // Calculate current points
    const currentPoints = Array.from(completedSteps).reduce(
      (sum, step) => sum + (STEP_POINTS[step as keyof typeof STEP_POINTS] || 0),
      0
    );

    // Get current step points
    const currentStepPoints = STEP_POINTS[currentStep as keyof typeof STEP_POINTS] || 0;

    // Build steps array for progress badge
    const steps = [
      {
        name: 'Personal Info',
        points: STEP_POINTS.personalInfo,
        completed: completedSteps.has('personalInfo'),
        current: currentStep === 'personalInfo',
      },
      {
        name: 'Professional Details',
        points: STEP_POINTS.professionalDetails,
        completed: completedSteps.has('professionalDetails'),
        current: currentStep === 'professionalDetails',
      },
      {
        name: 'Verification',
        points: STEP_POINTS.verification,
        completed: completedSteps.has('verification'),
        current: currentStep === 'verification',
      },
      {
        name: 'Availability',
        points: STEP_POINTS.availability,
        completed: completedSteps.has('availability'),
        current: currentStep === 'availability',
      },
    ];

    return {
      currentPoints,
      totalPoints: TOTAL_POINTS,
      currentStepPoints,
      requiredPoints: REQUIRED_POINTS,
      steps,
    };
  }, [completedSteps, currentStep]);

  const handleBackToLanding = () => {
    // Navigate back to role selection landing page
    if (typeof window !== "undefined") {
      window.location.href = "/onboarding";
    }
  };

  const handleBackFromProfessionalDetails = (data: ProfessionalDetailsData) => {
    setProfessionalDetails(data);
    setCurrentStep('personalInfo');
  };

  const handleBackFromVerification = (data: VerificationDetailsData) => {
    setVerification(data);
    setCurrentStep('professionalDetails');
  };

  const handleBackFromAvailability = (data: AvailabilityData) => {
    setAvailability(data);
    setCurrentStep('verification');
  };

  const handlePersonalInfoSubmit = async (data: PersonalInfoData) => {
    console.log('[TutorOnboardingWizard] handlePersonalInfoSubmit called', data);

    // Update state immediately
    setPersonalInfo(data);
    setIsLoading(true);

    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      const fullName = `${data.firstName} ${data.lastName}`.trim();

      // Save all personal info to profile
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: fullName,
          gender: data.gender,
          date_of_birth: data.dateOfBirth,
          phone: data.phone,
        })
        .eq('id', user!.id);

      if (error) {
        console.error('[TutorOnboardingWizard] Error saving personal info:', error);
        throw error;
      }

      console.log('[TutorOnboardingWizard] ✓ Personal info saved to profile');

      // Mark step as completed
      setCompletedSteps(prev => new Set(prev).add('personalInfo'));

      // Move to next step
      setCurrentStep('professionalDetails');

      // Update onboarding progress in background
      updateOnboardingProgress({
        current_step: 'professionalDetails',
      }).catch(error => {
        console.error('[TutorOnboardingWizard] Error updating progress:', error);
      });

    } catch (error) {
      console.error('[TutorOnboardingWizard] Error in handlePersonalInfoSubmit:', error);
      alert('Failed to save personal information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfessionalDetailsSubmit = async (data: ProfessionalDetailsData) => {
    console.log('[TutorOnboardingWizard] handleProfessionalDetailsSubmit called', data);

    // Update state and UI immediately
    setProfessionalDetails(data);

    // Mark step as completed
    setCompletedSteps(prev => new Set(prev).add('professionalDetails'));

    setCurrentStep('verification');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'verification',
      tutor: { professionalDetails: data }
    }).catch(error => {
      console.error('[TutorOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleVerificationSubmit = async (data: VerificationDetailsData) => {
    console.log('[TutorOnboardingWizard] handleVerificationSubmit called', data);

    // Update state immediately
    setVerification(data);

    // Mark step as completed (verification is optional, so always mark as completed)
    setCompletedSteps(prev => new Set(prev).add('verification'));

    // Navigate to next step IMMEDIATELY (optimistic, non-blocking)
    setCurrentStep('availability');

    // Save verification data in BACKGROUND (don't block navigation)
    // Only save if user has actually filled in some data
    const hasVerificationData =
      data.proof_of_address_url ||
      data.proof_of_address_type ||
      data.identity_verification_document_url ||
      data.identity_document_number ||
      data.dbs_certificate_url ||
      data.dbs_certificate_number;

    if (hasVerificationData) {
      // Save to database in background (non-blocking)
      (async () => {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();

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
            .eq('id', user!.id);

          if (error) {
            console.error('[TutorOnboardingWizard] ⚠️ Background verification save failed:', error);
            // Don't block user - error is logged only
          } else {
            console.log('[TutorOnboardingWizard] ✓ Verification saved to profile (background)');
          }
        } catch (error) {
          console.error('[TutorOnboardingWizard] ⚠️ Background verification save error:', error);
          // Don't block user - error is logged only
        }
      })();
    } else {
      console.log('[TutorOnboardingWizard] ⏩ No verification data provided, skipping save');
    }

    // Update onboarding progress in background
    updateOnboardingProgress({
      current_step: 'availability',
      tutor: { verification: data }
    }).catch(error => {
      console.error('[TutorOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleAvailabilitySubmit = async (data: AvailabilityData) => {
    console.log('[TutorOnboardingWizard] ========================================');
    console.log('[TutorOnboardingWizard] handleAvailabilitySubmit START');
    console.log('[TutorOnboardingWizard] Input data:', JSON.stringify(data, null, 2));
    console.log('[TutorOnboardingWizard] Current state - professionalDetails:', professionalDetails);
    console.log('[TutorOnboardingWizard] User ID:', user?.id);

    // Set availability state immediately
    setAvailability(data);

    // FORCE NAVIGATION: Call onComplete immediately to redirect to dashboard
    // This matches the working behavior from commit 949e7b8
    console.log('[TutorOnboardingWizard] 🚀 FORCING NAVIGATION...');
    console.log('[TutorOnboardingWizard] Calling onComplete() NOW...');
    onComplete();
    console.log('[TutorOnboardingWizard] ✓ onComplete() called - should redirect to dashboard');

    // Save to database in background (while dashboard is loading)
    console.log('[TutorOnboardingWizard] Saving to database (background operation)...');
    setIsLoading(true);

    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      // Add 'tutor' role to user's roles if not already present
      const currentRoles = profile?.roles || [];
      console.log('[TutorOnboardingWizard] Current roles:', currentRoles);

      if (!currentRoles.includes('tutor')) {
        console.log('[TutorOnboardingWizard] Adding tutor role to user profile...');
        const updatedRoles = [...currentRoles, 'tutor'];
        console.log('[TutorOnboardingWizard] Updated roles will be:', updatedRoles);

        const { data: roleData, error: roleError } = await supabase
          .from('profiles')
          .update({
            roles: updatedRoles,
            active_role: 'tutor'
          })
          .eq('id', user!.id)
          .select();

        console.log('[TutorOnboardingWizard] Role update response:', { data: roleData, error: roleError });

        if (roleError) {
          console.error('[TutorOnboardingWizard] Error adding tutor role:', roleError);
          throw roleError;
        }
        console.log('[TutorOnboardingWizard] ✓ Tutor role added');
      } else {
        console.log('[TutorOnboardingWizard] User already has tutor role, skipping role update');
      }

      // Save tutor role details to role_details table
      console.log('[TutorOnboardingWizard] Saving to role_details table...');

      const roleDetailsData = {
        profile_id: user!.id,
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
          // v4.9: New availability structure
          general_days: data.generalDays || [],
          general_times: data.generalTimes || [],
          availability_periods: data.availabilityPeriods || [],
          unavailability_periods: data.unavailabilityPeriods || [],
        },
        completed_at: new Date().toISOString(),
      };

      // Use upsert to insert or update the role_details record
      const { error: roleDetailsError } = await supabase
        .from('role_details')
        .upsert(roleDetailsData, {
          onConflict: 'profile_id,role_type'
        });

      if (roleDetailsError) {
        console.error('[TutorOnboardingWizard] Error saving role_details:', roleDetailsError);
        throw roleDetailsError;
      }

      console.log('[TutorOnboardingWizard] ✓ Saved to role_details table');

      // CRITICAL: Update onboarding_progress with ALL data including onboarding_completed flag
      // This must be a single atomic update to prevent overwrites
      console.log('[TutorOnboardingWizard] Updating onboarding progress (with completion flag)...');
      await updateOnboardingProgress({
        current_step: 'completion',
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
        tutor: {
          ...(professionalDetails && Object.keys(professionalDetails).length > 0 && { professionalDetails }),
          availability: data
        }
      });
      console.log('[TutorOnboardingWizard] ✓ Database save complete (onboarding marked as completed)');

      // Generate listing templates for new tutor
      console.log('[TutorOnboardingWizard] Generating listing templates...');
      try {
        const { generateListingTemplates, hasExistingTemplates } = await import('@/lib/utils/templateGenerator');

        // Check if templates already exist
        const hasTemplates = await hasExistingTemplates(user!.id);

        if (!hasTemplates) {
          const tutorName = personalInfo.firstName && personalInfo.lastName
            ? `${personalInfo.firstName} ${personalInfo.lastName}`
            : profile?.full_name || 'Tutor';

          const templateIds = await generateListingTemplates(user!.id, tutorName);
          console.log(`[TutorOnboardingWizard] ✓ Generated ${templateIds.length} listing templates`);
        } else {
          console.log('[TutorOnboardingWizard] Templates already exist, skipping generation');
        }
      } catch (templateError) {
        console.error('[TutorOnboardingWizard] ⚠️ Failed to generate templates:', templateError);
        // Non-critical error - don't block onboarding completion
      }

      console.log('[TutorOnboardingWizard] Clearing draft...');
      await clearDraft(user?.id, DRAFT_KEY);
      console.log('[TutorOnboardingWizard] ✓ Draft cleared');
      console.log('[TutorOnboardingWizard] ✓ All background database operations completed successfully');

    } catch (error) {
      console.error('[TutorOnboardingWizard] ❌ Background database save error:', error);
      // Don't show alert since user has already navigated away
      // Error is logged for debugging purposes
    } finally {
      setIsLoading(false);
    }

    console.log('[TutorOnboardingWizard] handleAvailabilitySubmit COMPLETE (navigation forced)');
    console.log('[TutorOnboardingWizard] ========================================');
  };

  const handleSkipHandler = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }

  const renderCurrentStep = () => {
    const progressProps = getProgressData;

    switch (currentStep) {
      case 'personalInfo':
        return (
          <TutorPersonalInfoStep
            onNext={handlePersonalInfoSubmit}
            onBack={handleBackToLanding}
            isLoading={isLoading}
            userRole="tutor" // For tutor onboarding, always show DBS fields
            progressData={progressProps}
          />
        );
      case 'professionalDetails':
        return (
          <TutorProfessionalDetailStep
            onNext={handleProfessionalDetailsSubmit}
            onBack={handleBackFromProfessionalDetails}
            isLoading={isLoading}
            progressData={progressProps}
          />
        );
      case 'verification':
        return (
          <TutorProfessionalVerificationStep
            onNext={handleVerificationSubmit}
            onBack={handleBackFromVerification}
            isLoading={isLoading}
            profileId={user?.id}
            progressData={progressProps}
          />
        );
      case 'availability':
        return (
          <TutorAvailabilityStep
            onNext={handleAvailabilitySubmit}
            onBack={handleBackFromAvailability}
            isLoading={isLoading}
            progressData={progressProps}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.wizardContainer} ${mode === 'fullPage' ? styles.fullPage : styles.modal}`}>
      {renderCurrentStep()}
    </div>
  );
};

export default TutorOnboardingWizard;
