// apps/web/src/app/components/onboarding/client/ClientOnboardingWizard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAutoSaveDraft, loadDraft, clearDraft, saveCurrentStep } from '@/lib/utils/wizardUtils';
import { OnboardingProgress } from '@/types';

// Corrected import paths
import WelcomeStep from '../steps/WelcomeStep';
import OnboardingProgressBar from '../OnboardingProgressBar';

import ClientSubjectSelectionStep from './ClientSubjectSelectionStep';
import ClientLearningPreferencesStep from './ClientLearningPreferencesStep';
import styles from '../../../onboarding/client/page.module.css';

export type ClientStep = 'subjects' | 'preferences' | 'completion';

interface ClientOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: ClientStep;
}

interface ClientDraftData {
  subjects: string[];
  preferences: any;
}

const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
  onComplete,
  onSkip,
  mode = 'modal',
  initialStep = 'subjects'
}) => {
  const { profile, user, updateOnboardingProgress } = useUserProfile();
  const DRAFT_KEY = 'onboarding_draft_client';

  const [currentStep, setCurrentStep] = useState<ClientStep>(initialStep);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [preferences, setPreferences] = useState({});
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
    setIsLoading(true);

    try {
      setPreferences(selectedPreferences);
      // Update the database with client-specific progress (but don't mark as complete yet)
      console.log('[ClientOnboardingWizard] Updating onboarding progress...');
      await updateOnboardingProgress({
        current_step: 'completion',
        seeker: { ...(profile?.onboarding_progress?.seeker || {}), subjects, preferences: selectedPreferences },
        onboarding_completed: false  // Master wizard will mark as complete
      });
      console.log('[ClientOnboardingWizard] Progress updated, clearing draft...');

      // Clear draft since client-specific onboarding is complete
      await clearDraft(user?.id, DRAFT_KEY);
      console.log('[ClientOnboardingWizard] Draft cleared, calling onComplete...');

      // Call parent's onComplete to return control to master wizard
      onComplete();
    } catch (error) {
      console.error('[ClientOnboardingWizard] Error in handlePreferencesNext:', error);
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
      default:
        return null;
    }
  };

  const getStepNumber = () => {
    const steps: ClientStep[] = ['subjects', 'preferences'];
    return steps.indexOf(currentStep) + 1;
  }

  return (
    <div className={`${styles.wizardContainer} ${mode === 'fullPage' ? styles.fullPage : styles.modal}`}>
      <OnboardingProgressBar currentStepId={getStepNumber()} totalSteps={2} />
      {renderCurrentStep()}
    </div>
  );
};

export default ClientOnboardingWizard;

