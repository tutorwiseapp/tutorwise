// apps/web/src/app/components/onboarding/agent/AgentOnboardingWizard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAutoSaveDraft, loadDraft, clearDraft, saveCurrentStep, loadSavedStep } from '@/lib/utils/wizardUtils';
import { createClient } from '@/utils/supabase/client';
import AgentWelcomeStep from '@/app/components/feature/onboarding/steps/WelcomeStep';
import AgentPersonalInfoStep from './AgentPersonalInfoStep';
import AgentDetailsStep from './AgentDetailsStep';
import AgentServicesStep from './AgentServicesStep';
import AgentCapacityStep from './AgentCapacityStep';
import { AgencyDetailsData, CapacityData } from '@/types';
import { PersonalInfoData } from '../tutor/TutorOnboardingWizard';
import styles from '../OnboardingWizard.module.css';

export type AgentOnboardingStep = 'personalInfo' | 'details' | 'services' | 'capacity' | 'completion';

interface AgentOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: string;
}

interface AgentDraftData {
  personalInfo: Partial<PersonalInfoData>;
  agencyDetails: Partial<AgencyDetailsData>;
  services: string[];
  capacity: Partial<CapacityData>;
}

const AgentOnboardingWizard: React.FC<AgentOnboardingWizardProps> = ({
  onComplete,
  onSkip,
  mode = 'fullPage',
  initialStep
}) => {
  const { profile, user, updateOnboardingProgress } = useUserProfile();
  const supabase = createClient();
  const DRAFT_KEY = 'onboarding_draft_agent';

  const [currentStep, setCurrentStep] = useState<AgentOnboardingStep>(
    (initialStep as AgentOnboardingStep) || 'personalInfo'
  );
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInfoData>>({});
  const [agencyDetails, setAgencyDetails] = useState<Partial<AgencyDetailsData>>({});
  const [services, setServices] = useState<string[]>([]);
  const [capacity, setCapacity] = useState<Partial<CapacityData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Load draft AND saved step from database on mount
  useEffect(() => {
    async function loadSavedDraft() {
      if (!isDraftLoaded) {
        const draft = await loadDraft<AgentDraftData>(user?.id, DRAFT_KEY);
        if (draft) {
          if (draft.personalInfo) setPersonalInfo(draft.personalInfo);
          if (draft.agencyDetails) setAgencyDetails(draft.agencyDetails);
          if (draft.services) setServices(draft.services);
          if (draft.capacity) setCapacity(draft.capacity);
        }

        // Load saved step (only if not explicitly provided via initialStep prop)
        if (!initialStep) {
          const savedStep = await loadSavedStep(user?.id, DRAFT_KEY);
          if (savedStep && savedStep !== 'completion') {
            console.log('[Wizard] Restoring saved step:', savedStep);
            setCurrentStep(savedStep as any);
          }
        }

        setIsDraftLoaded(true);
      }
    }
    loadSavedDraft();
  }, [user?.id, isDraftLoaded, initialStep]);

  // Prepare form data for auto-save - memoized to prevent unnecessary re-renders
  const formData = React.useMemo<AgentDraftData>(() => ({
    personalInfo,
    agencyDetails,
    services,
    capacity,
  }), [personalInfo, agencyDetails, services, capacity]);

  // Memoize shouldSave callback to prevent recreation on every render
  const shouldSave = React.useCallback(
    (data: AgentDraftData) => !!data.personalInfo?.firstName || Object.keys(data.agencyDetails).length > 0,
    []
  );

  // Auto-save draft every 30 seconds (with database sync)
  const { saveDraft } = useAutoSaveDraft<AgentDraftData>(
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

  const handlePersonalInfoSubmit = async (data: PersonalInfoData) => {
    console.log('[AgentOnboardingWizard] handlePersonalInfoSubmit called', data);

    // Update state immediately
    setPersonalInfo(data);
    setIsLoading(true);

    try {
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
        console.error('[AgentOnboardingWizard] Error saving personal info:', error);
        throw error;
      }

      console.log('[AgentOnboardingWizard] ✓ Personal info saved to profile');

      // Move to next step
      setCurrentStep('details');

      // Update onboarding progress in background
      updateOnboardingProgress({
        current_step: 'details',
      }).catch(error => {
        console.error('[AgentOnboardingWizard] Error updating progress:', error);
      });

    } catch (error) {
      console.error('[AgentOnboardingWizard] Error in handlePersonalInfoSubmit:', error);
      alert('Failed to save personal information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetailsSubmit = async (data: AgencyDetailsData) => {
    console.log('[AgentOnboardingWizard] handleDetailsSubmit called', data);

    // Update state and UI immediately
    setAgencyDetails(data);
    setCurrentStep('services');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'services',
      agent: { details: data }
    }).catch(error => {
      console.error('[AgentOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleServicesSubmit = async (selectedServices: string[]) => {
    console.log('[AgentOnboardingWizard] handleServicesSubmit called', selectedServices);

    // Update state and UI immediately
    setServices(selectedServices);
    setCurrentStep('capacity');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'capacity',
      agent: { ...(Object.keys(agencyDetails).length > 0 && { details: agencyDetails as AgencyDetailsData }), services: selectedServices }
    }).catch(error => {
      console.error('[AgentOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleCapacitySubmit = async (data: CapacityData) => {
    console.log('[AgentOnboardingWizard] ========================================');
    console.log('[AgentOnboardingWizard] handleCapacitySubmit START');
    console.log('[AgentOnboardingWizard] Input data:', JSON.stringify(data, null, 2));
    console.log('[AgentOnboardingWizard] User ID:', user?.id);

    // Set capacity state immediately
    setCapacity(data);

    // FORCE NAVIGATION: Call onComplete immediately to redirect to dashboard
    // This matches the working behavior from commit 949e7b8
    console.log('[AgentOnboardingWizard] 🚀 FORCING NAVIGATION...');
    console.log('[AgentOnboardingWizard] Calling onComplete() NOW...');
    onComplete();
    console.log('[AgentOnboardingWizard] ✓ onComplete() called - should redirect to dashboard');

    // Save to database in background (while dashboard is loading)
    console.log('[AgentOnboardingWizard] Saving to database (background operation)...');
    setIsLoading(true);

    try {
      // Add 'agent' role to user's roles if not already present
      const currentRoles = profile?.roles || [];
      console.log('[AgentOnboardingWizard] Current roles:', currentRoles);

      if (!currentRoles.includes('agent')) {
        console.log('[AgentOnboardingWizard] Adding agent role to user profile...');
        const updatedRoles = [...currentRoles, 'agent'];
        console.log('[AgentOnboardingWizard] Updated roles will be:', updatedRoles);

        const { data: roleData, error: roleError } = await supabase
          .from('profiles')
          .update({
            roles: updatedRoles,
            active_role: 'agent'
          })
          .eq('id', user!.id)
          .select();

        console.log('[AgentOnboardingWizard] Role update response:', { data: roleData, error: roleError });

        if (roleError) {
          console.error('[AgentOnboardingWizard] Error adding agent role:', roleError);
          throw roleError;
        }
        console.log('[AgentOnboardingWizard] ✓ Agent role added');
      } else {
        console.log('[AgentOnboardingWizard] User already has agent role, skipping role update');
      }

      // Save agent role details to role_details table
      console.log('[AgentOnboardingWizard] Saving to role_details table...');

      const roleDetailsData = {
        profile_id: user!.id,
        role_type: 'agent',
        agency_details: {
          agency_name: agencyDetails.agencyName || '',
          agency_size: agencyDetails.agencySize || '',
          years_in_business: agencyDetails.yearsInBusiness || '',
          description: agencyDetails.description || '',
        },
        services: services || [],
        capacity_details: {
          commission_rate: data.commissionRate || 0,
          service_areas: data.serviceAreas || [],
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
        console.error('[AgentOnboardingWizard] Error saving role_details:', roleDetailsError);
        throw roleDetailsError;
      }

      console.log('[AgentOnboardingWizard] ✓ Saved to role_details table');

      // CRITICAL: Update onboarding_progress with ALL data including onboarding_completed flag
      // This must be a single atomic update to prevent overwrites
      console.log('[AgentOnboardingWizard] Updating onboarding progress (with completion flag)...');
      await updateOnboardingProgress({
        current_step: 'completion',
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
        agent: { ...(Object.keys(agencyDetails).length > 0 && { details: agencyDetails as AgencyDetailsData }), services, capacity: data }
      });
      console.log('[AgentOnboardingWizard] ✓ Database save complete (onboarding marked as completed)');

      console.log('[AgentOnboardingWizard] Clearing draft...');
      await clearDraft(user?.id, DRAFT_KEY);
      console.log('[AgentOnboardingWizard] ✓ Draft cleared');
      console.log('[AgentOnboardingWizard] ✓ All background database operations completed successfully');

    } catch (error) {
      console.error('[AgentOnboardingWizard] ❌ Background database save error:', error);
      // Don't show alert since user has already navigated away
      // Error is logged for debugging purposes
    } finally {
      setIsLoading(false);
    }

    console.log('[AgentOnboardingWizard] handleCapacitySubmit COMPLETE (navigation forced)');
    console.log('[AgentOnboardingWizard] ========================================');
  };


  const handleBack = () => {
    if (currentStep === "details") setCurrentStep("personalInfo");
    if (currentStep === "services") setCurrentStep("details");
    if (currentStep === "capacity") setCurrentStep("services");
  };

  const handleBackToLanding = () => {
    // Navigate back to role selection landing page
    if (typeof window !== "undefined") {
      window.location.href = "/onboarding";
    }
  };

  const handleSkipHandler = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'personalInfo':
        return (
          <AgentPersonalInfoStep
            onNext={handlePersonalInfoSubmit}
            onBack={handleBackToLanding}
            isLoading={isLoading}
          />
        );
      case 'details':
        return <AgentDetailsStep onNext={handleDetailsSubmit} onBack={handleBack} isLoading={isLoading} />;
      case 'services':
        return <AgentServicesStep onNext={handleServicesSubmit} onBack={handleBack} isLoading={isLoading} />;
      case 'capacity':
        return <AgentCapacityStep onNext={handleCapacitySubmit} onBack={handleBack} isLoading={isLoading} />;
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

export default AgentOnboardingWizard;
