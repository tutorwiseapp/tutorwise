// apps/web/src/app/components/onboarding/client/ClientOnboardingWizard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAutoSaveDraft, loadDraft, clearDraft, saveCurrentStep } from '@/lib/utils/wizardUtils';
import { OnboardingProgress } from '@/types';
import { createClient } from '@/utils/supabase/client';

// Corrected import paths
import WelcomeStep from '../steps/WelcomeStep';
import OnboardingProgressBar from '../OnboardingProgressBar';

import ClientSubjectSelectionStep from './ClientSubjectSelectionStep';
import ClientLearningPreferencesStep from './ClientLearningPreferencesStep';
import ClientAvailabilityStep from './ClientAvailabilityStep';
import styles from '../../../onboarding/client/page.module.css';

export type ClientStep = 'subjects' | 'preferences' | 'availability' | 'completion';

interface ClientOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: ClientStep;
}

interface ClientDraftData {
  subjects: string[];
  preferences: any;
  availability: any;
}

const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
  onComplete,
  onSkip,
  mode = 'modal',
  initialStep = 'subjects'
}) => {
  const { profile, user, updateOnboardingProgress } = useUserProfile();
  const supabase = createClient();
  const DRAFT_KEY = 'onboarding_draft_client';

  const [currentStep, setCurrentStep] = useState<ClientStep>(initialStep);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [preferences, setPreferences] = useState({});
  const [availability, setAvailability] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Load draft from database on mount
  useEffect(() => {
    async function loadSavedDraft() {
      if (!isDraftLoaded) {
        const draft = await loadDraft<ClientDraftData>(user?.id, DRAFT_KEY);
        if (draft) {
          if (draft.subjects) setSubjects(draft.subjects);
          if (draft.preferences) setPreferences(draft.preferences);
          if (draft.availability) setAvailability(draft.availability);
        }
        setIsDraftLoaded(true);
      }
    }
    loadSavedDraft();
  }, [user?.id, isDraftLoaded]);

  // Prepare form data for auto-save
  const formData: ClientDraftData = {
    subjects,
    preferences,
    availability,
  };

  // Auto-save draft every 30 seconds (with database sync)
  const { saveDraft } = useAutoSaveDraft<ClientDraftData>(
    user?.id,
    DRAFT_KEY,
    formData,
    (data) => data.subjects.length > 0 // Only save if user has selected at least one subject
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

  const handleBack = () => {
    if (currentStep === 'preferences') setCurrentStep('subjects');
    if (currentStep === 'availability') setCurrentStep('preferences');
  }

  const handleSkipHandler = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }

  const handleSubjectsNext = async (selectedSubjects: string[]) => {
    console.log('[ClientOnboardingWizard] handleSubjectsNext called', selectedSubjects);

    // Update state and UI immediately
    setSubjects(selectedSubjects);
    setCurrentStep('preferences');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'preferences',
      seeker: { ...(profile?.onboarding_progress?.seeker || {}), subjects: selectedSubjects }
    }).catch(error => {
      console.error('[ClientOnboardingWizard] Error updating progress:', error);
    });
  };

  const handlePreferencesNext = async (selectedPreferences: any) => {
    console.log('[ClientOnboardingWizard] handlePreferencesNext called', selectedPreferences);

    // Update state and UI immediately
    setPreferences(selectedPreferences);
    setCurrentStep('availability');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'availability',
      seeker: { ...(profile?.onboarding_progress?.seeker || {}), subjects, preferences: selectedPreferences }
    }).catch(error => {
      console.error('[ClientOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleAvailabilityNext = async (selectedAvailability: any) => {
    console.log('[ClientOnboardingWizard] handleAvailabilityNext called', selectedAvailability);
    setIsLoading(true);

    try {
      setAvailability(selectedAvailability);

      // Add 'seeker' role to user's roles if not already present
      const currentRoles = profile?.roles || [];
      if (!currentRoles.includes('seeker')) {
        console.log('[ClientOnboardingWizard] Adding seeker role to user profile...');
        const updatedRoles = [...currentRoles, 'seeker'];
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ roles: updatedRoles })
          .eq('id', user?.id);

        if (roleError) {
          console.error('[ClientOnboardingWizard] Error adding seeker role:', roleError);
          throw roleError;
        }
      }

      // Update the database with client-specific progress and mark as complete
      console.log('[ClientOnboardingWizard] Updating onboarding progress...');
      await updateOnboardingProgress({
        current_step: 'completion',
        seeker: { ...(profile?.onboarding_progress?.seeker || {}), subjects, preferences, availability: selectedAvailability },
        onboarding_completed: true,  // Mark as complete for standalone client onboarding
        completed_at: new Date().toISOString()
      });
      console.log('[ClientOnboardingWizard] Progress updated, clearing draft...');

      // Clear draft since client-specific onboarding is complete
      await clearDraft(user?.id, DRAFT_KEY);
      console.log('[ClientOnboardingWizard] Draft cleared, calling onComplete...');

      // Call parent's onComplete to redirect to dashboard
      onComplete();
    } catch (error) {
      console.error('[ClientOnboardingWizard] Error in handleAvailabilityNext:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'subjects':
        return <ClientSubjectSelectionStep onNext={handleSubjectsNext} onSkip={handleSkipHandler} isLoading={isLoading} initialSubjects={subjects} />;
      case 'preferences':
        return <ClientLearningPreferencesStep onNext={handlePreferencesNext} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
      case 'availability':
        return <ClientAvailabilityStep onNext={handleAvailabilityNext} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  const getStepNumber = () => {
    const steps: ClientStep[] = ['subjects', 'preferences', 'availability'];
    return steps.indexOf(currentStep) + 1;
  }

  return (
    <div className={`${styles.wizardContainer} ${mode === 'fullPage' ? styles.fullPage : styles.modal}`}>
      <OnboardingProgressBar currentStepId={getStepNumber()} totalSteps={3} />
      {renderCurrentStep()}
    </div>
  );
};

export default ClientOnboardingWizard;

