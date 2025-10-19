// apps/web/src/app/components/onboarding/agent/AgentOnboardingWizard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAutoSaveDraft, loadDraft, clearDraft, saveCurrentStep } from '@/lib/utils/wizardUtils';
import { createClient } from '@/utils/supabase/client';
import AgentWelcomeStep from '@/app/components/onboarding/steps/WelcomeStep';
import AgentDetailsStep from './AgentDetailsStep';
import AgentServicesStep from './AgentServicesStep';
import AgentCapacityStep from './AgentCapacityStep';
import { AgencyDetailsData, CapacityData } from '@/types';
import styles from '../OnboardingWizard.module.css';

export type AgentOnboardingStep = 'details' | 'services' | 'capacity' | 'completion';

interface AgentOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: string;
}

interface AgentDraftData {
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
    (initialStep as AgentOnboardingStep) || 'details'
  );
  const [agencyDetails, setAgencyDetails] = useState<Partial<AgencyDetailsData>>({});
  const [services, setServices] = useState<string[]>([]);
  const [capacity, setCapacity] = useState<Partial<CapacityData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Load draft from database on mount
  useEffect(() => {
    async function loadSavedDraft() {
      if (!isDraftLoaded) {
        const draft = await loadDraft<AgentDraftData>(user?.id, DRAFT_KEY);
        if (draft) {
          if (draft.agencyDetails) setAgencyDetails(draft.agencyDetails);
          if (draft.services) setServices(draft.services);
          if (draft.capacity) setCapacity(draft.capacity);
        }
        setIsDraftLoaded(true);
      }
    }
    loadSavedDraft();
  }, [user?.id, isDraftLoaded]);

  // Prepare form data for auto-save
  const formData: AgentDraftData = {
    agencyDetails,
    services,
    capacity,
  };

  // Auto-save draft every 30 seconds (with database sync)
  const { saveDraft } = useAutoSaveDraft<AgentDraftData>(
    user?.id,
    DRAFT_KEY,
    formData,
    (data) => Object.keys(data.agencyDetails).length > 0 // Only save if user has entered agency details
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
    console.log('[AgentOnboardingWizard] handleCapacitySubmit called', data);
    setIsLoading(true);

    try {
      setCapacity(data);

      // Add 'agent' role to user's roles if not already present
      const currentRoles = profile?.roles || [];
      if (!currentRoles.includes('agent')) {
        console.log('[AgentOnboardingWizard] Adding agent role to user profile...');
        const updatedRoles = [...currentRoles, 'agent'];
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ roles: updatedRoles })
          .eq('id', user?.id);

        if (roleError) {
          console.error('[AgentOnboardingWizard] Error adding agent role:', roleError);
          throw roleError;
        }
      }

      // Update the database with agent-specific progress and mark as complete
      console.log('[AgentOnboardingWizard] Updating onboarding progress...');
      await updateOnboardingProgress({
        current_step: 'completion',
        agent: { ...(Object.keys(agencyDetails).length > 0 && { details: agencyDetails as AgencyDetailsData }), services, capacity: data },
        onboarding_completed: true,  // Mark as complete for standalone agent onboarding
        completed_at: new Date().toISOString()
      });
      console.log('[AgentOnboardingWizard] Progress updated, clearing draft...');

      // Clear draft since agent-specific onboarding is complete
      await clearDraft(user?.id, DRAFT_KEY);
      console.log('[AgentOnboardingWizard] Draft cleared, calling onComplete...');

      // Call parent's onComplete to redirect to dashboard
      onComplete();
    } catch (error) {
      console.error('[AgentOnboardingWizard] Error in handleCapacitySubmit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'services') setCurrentStep('details');
    if (currentStep === 'capacity') setCurrentStep('services');
  }

  const handleSkipHandler = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'details':
        return <AgentDetailsStep onNext={handleDetailsSubmit} onSkip={handleSkipHandler} isLoading={isLoading} />;
      case 'services':
        return <AgentServicesStep onNext={handleServicesSubmit} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
      case 'capacity':
        return <AgentCapacityStep onNext={handleCapacitySubmit} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
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
