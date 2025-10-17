// apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAutoSaveDraft, loadDraft, clearDraft, saveCurrentStep } from '@/lib/utils/wizardUtils';
import TutorWelcomeStep from '@/app/components/onboarding/steps/WelcomeStep';
import TutorSubjectSelectionStep from './TutorSubjectSelectionStep';
import TutorQualificationsStep from './TutorQualificationsStep';
import TutorAvailabilityStep from './TutorAvailabilityStep';
import { QualificationsData, AvailabilityData } from '@/types';
import styles from '../OnboardingWizard.module.css';

export type TutorOnboardingStep = 'subjects' | 'qualifications' | 'availability' | 'completion';

interface TutorOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: string;
}

interface TutorDraftData {
  subjects: string[];
  qualifications: Partial<QualificationsData>;
  availability: Partial<AvailabilityData>;
}

const TutorOnboardingWizard: React.FC<TutorOnboardingWizardProps> = ({
  onComplete,
  onSkip,
  mode = 'fullPage',
  initialStep
}) => {
  const { profile, user, updateOnboardingProgress } = useUserProfile();
  const DRAFT_KEY = 'onboarding_draft_tutor';

  const [currentStep, setCurrentStep] = useState<TutorOnboardingStep>(
    (initialStep as TutorOnboardingStep) || 'subjects'
  );
  const [subjects, setSubjects] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState<Partial<QualificationsData>>({});
  const [availability, setAvailability] = useState<Partial<AvailabilityData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Load draft from database on mount
  useEffect(() => {
    async function loadSavedDraft() {
      if (!isDraftLoaded) {
        const draft = await loadDraft<TutorDraftData>(user?.id, DRAFT_KEY);
        if (draft) {
          if (draft.subjects) setSubjects(draft.subjects);
          if (draft.qualifications) setQualifications(draft.qualifications);
          if (draft.availability) setAvailability(draft.availability);
        }
        setIsDraftLoaded(true);
      }
    }
    loadSavedDraft();
  }, [user?.id, isDraftLoaded]);

  // Prepare form data for auto-save
  const formData: TutorDraftData = {
    subjects,
    qualifications,
    availability,
  };

  // Auto-save draft every 30 seconds (with database sync)
  const { saveDraft } = useAutoSaveDraft<TutorDraftData>(
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
    if (currentStep === 'qualifications') setCurrentStep('subjects');
    if (currentStep === 'availability') setCurrentStep('qualifications');
  }

  const handleSubjectsSubmit = async (selectedSubjects: string[]) => {
    console.log('[TutorOnboardingWizard] handleSubjectsSubmit called', selectedSubjects);

    // Update state and UI immediately
    setSubjects(selectedSubjects);
    setCurrentStep('qualifications');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'qualifications',
      provider: { subjects: selectedSubjects }
    }).catch(error => {
      console.error('[TutorOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleQualificationsSubmit = async (data: QualificationsData) => {
    console.log('[TutorOnboardingWizard] handleQualificationsSubmit called', data);

    // Update state and UI immediately
    setQualifications(data);
    setCurrentStep('availability');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'availability',
      provider: { subjects, qualifications: data }
    }).catch(error => {
      console.error('[TutorOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleAvailabilitySubmit = async (data: AvailabilityData) => {
    console.log('[TutorOnboardingWizard] ========================================');
    console.log('[TutorOnboardingWizard] handleAvailabilitySubmit START');
    console.log('[TutorOnboardingWizard] Input data:', JSON.stringify(data, null, 2));
    console.log('[TutorOnboardingWizard] Current state - subjects:', subjects);
    console.log('[TutorOnboardingWizard] Current state - qualifications:', qualifications);
    console.log('[TutorOnboardingWizard] User ID:', user?.id);

    // Set availability state immediately
    setAvailability(data);

    // FORCE NAVIGATION: Call onComplete immediately to advance to CompletionStep
    console.log('[TutorOnboardingWizard] 🚀 FORCING NAVIGATION to CompletionStep...');
    console.log('[TutorOnboardingWizard] Calling onComplete() NOW...');
    onComplete();
    console.log('[TutorOnboardingWizard] ✓ onComplete() called - should advance to CompletionStep');

    // Save to database WHILE CompletionStep is showing (2 second success message)
    // This gives us time to complete the save before redirecting to dashboard
    console.log('[TutorOnboardingWizard] Saving to database (will complete during CompletionStep)...');
    setIsLoading(true);

    try {
      console.log('[TutorOnboardingWizard] Database save: Preparing progress update...');
      const progressUpdate = {
        current_step: 'completion',
        provider: {
          subjects,
          ...(Object.keys(qualifications).length > 0 && { qualifications: qualifications as QualificationsData }),
          availability: data
        },
        onboarding_completed: true,
        completed_at: new Date().toISOString()
      };

      console.log('[TutorOnboardingWizard] Database save: Updating onboarding progress...');
      await updateOnboardingProgress(progressUpdate);
      console.log('[TutorOnboardingWizard] ✓ Database save complete - onboarding marked as completed');

      // CRITICAL: Add 'provider' role to user's roles array if not already present
      if (profile && !profile.roles.includes('provider')) {
        console.log('[TutorOnboardingWizard] Adding provider role to user profile...');
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const updatedRoles = [...(profile.roles || []), 'provider'];
        await supabase
          .from('profiles')
          .update({
            roles: updatedRoles,
            active_role: 'provider'
          })
          .eq('id', user!.id);
        console.log('[TutorOnboardingWizard] ✓ Provider role added');
      }

      console.log('[TutorOnboardingWizard] Database save: Clearing draft...');
      await clearDraft(user?.id, DRAFT_KEY);
      console.log('[TutorOnboardingWizard] ✓ Draft cleared');

    } catch (error) {
      console.error('[TutorOnboardingWizard] ❌ Database save error:', error);
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
    switch (currentStep) {
      case 'subjects':
        return <TutorSubjectSelectionStep onNext={handleSubjectsSubmit} onSkip={handleSkipHandler} isLoading={isLoading} />;
      case 'qualifications':
        return <TutorQualificationsStep onNext={handleQualificationsSubmit} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
      case 'availability':
        return <TutorAvailabilityStep onNext={handleAvailabilitySubmit} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
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
