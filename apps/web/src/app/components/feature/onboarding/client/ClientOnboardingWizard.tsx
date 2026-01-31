// apps/web/src/app/components/feature/onboarding/client/ClientOnboardingWizard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAutoSaveDraft, loadDraft, clearDraft, saveCurrentStep, loadSavedStep } from '@/lib/utils/wizardUtils';
import { OnboardingProgress } from '@/types';
import { createClient } from '@/utils/supabase/client';

// Corrected import paths
import WelcomeStep from '../steps/WelcomeStep';
import OnboardingProgressBar from '../OnboardingProgressBar';

import ClientPersonalInfoStep from './ClientPersonalInfoStep';
import ClientSubjectSelectionStep from './ClientSubjectSelectionStep';
import ClientLearningPreferencesStep from './ClientLearningPreferencesStep';
import ClientAvailabilityStep from './ClientAvailabilityStep';
import { PersonalInfoData } from '../shared/steps/PersonalInfoStep';
import styles from '../OnboardingWizard.module.css';

export type ClientStep = 'personalInfo' | 'subjects' | 'preferences' | 'availability' | 'completion';

interface ClientOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: ClientStep;
}

interface ClientDraftData {
  personalInfo: Partial<PersonalInfoData>;
  subjects: string[];
  preferences: any;
  availability: any;
}

const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
  onComplete,
  onSkip,
  mode = 'modal',
  initialStep = 'personalInfo'
}) => {
  const { profile, user, updateOnboardingProgress } = useUserProfile();
  const supabase = createClient();
  const DRAFT_KEY = 'onboarding_draft_client';

  const [currentStep, setCurrentStep] = useState<ClientStep>(initialStep);
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInfoData>>({});
  const [subjects, setSubjects] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<any>({});
  const [availability, setAvailability] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Load draft AND saved step from database on mount
  useEffect(() => {
    async function loadSavedDraft() {
      if (!isDraftLoaded) {
        const draft = await loadDraft<ClientDraftData>(user?.id, DRAFT_KEY);
        if (draft) {
          if (draft.personalInfo) setPersonalInfo(draft.personalInfo);
          if (draft.subjects) setSubjects(draft.subjects);
          if (draft.preferences) setPreferences(draft.preferences);
          if (draft.availability) setAvailability(draft.availability);
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
  const formData = React.useMemo<ClientDraftData>(() => ({
    personalInfo,
    subjects,
    preferences,
    availability,
  }), [personalInfo, subjects, preferences, availability]);

  // Memoize shouldSave callback to prevent recreation on every render
  const shouldSave = React.useCallback(
    (data: ClientDraftData) => !!data.personalInfo?.firstName || data.subjects.length > 0,
    []
  );

  // Auto-save draft every 30 seconds (with database sync)
  const { saveDraft } = useAutoSaveDraft<ClientDraftData>(
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


  const handleBackToLanding = () => {
    // Navigate back to role selection landing page
    if (typeof window !== "undefined") {
      window.location.href = "/onboarding";
    }
  };

  const handleBack = () => {
    if (currentStep === "subjects") setCurrentStep("personalInfo");
    if (currentStep === "preferences") setCurrentStep("subjects");
    if (currentStep === "availability") setCurrentStep("preferences");
  };

  const handleSkipHandler = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }

  const handlePersonalInfoSubmit = async (data: PersonalInfoData) => {
    console.log('[ClientOnboardingWizard] handlePersonalInfoSubmit called', data);

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
        console.error('[ClientOnboardingWizard] Error saving personal info:', error);
        throw error;
      }

      console.log('[ClientOnboardingWizard] ✓ Personal info saved to profile');

      // Move to next step
      setCurrentStep('subjects');

      // Update onboarding progress in background
      updateOnboardingProgress({
        current_step: 'subjects',
      }).catch(error => {
        console.error('[ClientOnboardingWizard] Error updating progress:', error);
      });

    } catch (error) {
      console.error('[ClientOnboardingWizard] Error in handlePersonalInfoSubmit:', error);
      alert('Failed to save personal information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubjectsNext = async (selectedSubjects: string[]) => {
    console.log('[ClientOnboardingWizard] handleSubjectsNext called', selectedSubjects);

    // Update state and UI immediately
    setSubjects(selectedSubjects);
    setCurrentStep('preferences');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'preferences',
      client: { ...(profile?.onboarding_progress?.client || {}), subjects: selectedSubjects }
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
      client: { ...(profile?.onboarding_progress?.client || {}), subjects, preferences: selectedPreferences }
    }).catch(error => {
      console.error('[ClientOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleAvailabilityNext = async (selectedAvailability: any) => {
    console.log('[ClientOnboardingWizard] ========================================');
    console.log('[ClientOnboardingWizard] handleAvailabilityNext START');
    console.log('[ClientOnboardingWizard] Input data:', JSON.stringify(selectedAvailability, null, 2));
    console.log('[ClientOnboardingWizard] User ID:', user?.id);

    // Set availability state immediately
    setAvailability(selectedAvailability);

    // FORCE NAVIGATION: Call onComplete immediately to redirect to dashboard
    // This matches the working behavior from commit 949e7b8
    console.log('[ClientOnboardingWizard] 🚀 FORCING NAVIGATION...');
    console.log('[ClientOnboardingWizard] Calling onComplete() NOW...');
    onComplete();
    console.log('[ClientOnboardingWizard] ✓ onComplete() called - should redirect to dashboard');

    // Save to database in background (while dashboard is loading)
    console.log('[ClientOnboardingWizard] Saving to database (background operation)...');
    setIsLoading(true);

    try {
      // Add 'client' role to user's roles if not already present
      const currentRoles = profile?.roles || [];
      if (!currentRoles.includes('client')) {
        console.log('[ClientOnboardingWizard] Adding client role to user profile...');
        const updatedRoles = [...currentRoles, 'client'];
        const { error: roleError } = await supabase
          .from('profiles')
          .update({
            roles: updatedRoles,
            active_role: 'client'
          })
          .eq('id', user?.id);

        if (roleError) {
          console.error('[ClientOnboardingWizard] Error adding client role:', roleError);
          throw roleError;
        }
        console.log('[ClientOnboardingWizard] ✓ Client role added');
      }

      // Save client role details to role_details table
      console.log('[ClientOnboardingWizard] Saving to role_details table...');

      const roleDetailsData = {
        profile_id: user!.id,
        role_type: 'client',
        subjects: subjects || [],
        learning_style: preferences.learningStyle || '',
        budget_range: selectedAvailability.hourlyBudget ? {
          min: selectedAvailability.hourlyBudget,
          max: selectedAvailability.hourlyBudget + 20
        } : {},
        schedule_preferences: {
          session_types: selectedAvailability.sessionTypes || [],
          availability_slots: selectedAvailability.availability || [],
          location_preference: preferences.location || ''
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
        console.error('[ClientOnboardingWizard] Error saving role_details:', roleDetailsError);
        throw roleDetailsError;
      }

      console.log('[ClientOnboardingWizard] ✓ Saved to role_details table');

      // CRITICAL: Update onboarding_progress with ALL data including onboarding_completed flag
      // This must be a single atomic update to prevent overwrites
      console.log('[ClientOnboardingWizard] Updating onboarding progress (with completion flag)...');
      await updateOnboardingProgress({
        current_step: 'completion',
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
        client: { subjects, preferences, availability: selectedAvailability }
      });
      console.log('[ClientOnboardingWizard] ✓ Database save complete (onboarding marked as completed)');

      console.log('[ClientOnboardingWizard] Clearing draft...');
      await clearDraft(user?.id, DRAFT_KEY);
      console.log('[ClientOnboardingWizard] ✓ Draft cleared');
      console.log('[ClientOnboardingWizard] ✓ All background database operations completed successfully');

    } catch (error) {
      console.error('[ClientOnboardingWizard] ❌ Background database save error:', error);
      // Don't show alert since user has already navigated away
      // Error is logged for debugging purposes
    } finally {
      setIsLoading(false);
    }

    console.log('[ClientOnboardingWizard] handleAvailabilityNext COMPLETE (navigation forced)');
    console.log('[ClientOnboardingWizard] ========================================');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'personalInfo':
        return (
          <ClientPersonalInfoStep
            onNext={handlePersonalInfoSubmit}
            onBack={handleBackToLanding}
            isLoading={isLoading}
          />
        );
      case 'subjects':
        return <ClientSubjectSelectionStep onNext={handleSubjectsNext} onBack={handleBack} isLoading={isLoading} initialSubjects={subjects} />;
      case 'preferences':
        return <ClientLearningPreferencesStep onNext={handlePreferencesNext} onBack={handleBack} isLoading={isLoading} />;
      case 'availability':
        return <ClientAvailabilityStep onNext={handleAvailabilityNext} onBack={handleBack} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  const getStepNumber = () => {
    const steps: ClientStep[] = ['personalInfo', 'subjects', 'preferences', 'availability'];
    return steps.indexOf(currentStep) + 1;
  }

  return (
    <div className={`${styles.wizardContainer} ${mode === 'fullPage' ? styles.fullPage : styles.modal}`}>
      <OnboardingProgressBar currentStepId={getStepNumber()} totalSteps={4} />
      {renderCurrentStep()}
    </div>
  );
};

export default ClientOnboardingWizard;

