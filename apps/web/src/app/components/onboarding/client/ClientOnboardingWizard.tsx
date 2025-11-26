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

import ClientPersonalInfoStep from './ClientPersonalInfoStep';
import ClientSubjectSelectionStep from './ClientSubjectSelectionStep';
import ClientLearningPreferencesStep from './ClientLearningPreferencesStep';
import ClientAvailabilityStep from './ClientAvailabilityStep';
import { PersonalInfoData } from '../tutor/TutorOnboardingWizard';
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

  // Load draft from database on mount
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
        setIsDraftLoaded(true);
      }
    }
    loadSavedDraft();
  }, [user?.id, isDraftLoaded]);

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

  const handleBack = () => {
    if (currentStep === 'subjects') setCurrentStep('personalInfo');
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
          address_line1: data.address,
          town: data.town,
          city: data.city,
          country: data.country,
          postal_code: data.postalCode,
          emergency_contact_name: data.emergencyContactName,
          emergency_contact_email: data.emergencyContactEmail,
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
    setIsLoading(true);

    // Continue saving data in background
    console.log('[ClientOnboardingWizard] Saving data to database...');

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

      // Map onboarding data to professional_details.client structure
      console.log('[ClientOnboardingWizard] Saving to professional_details.client...');
      const currentProfessionalDetails = profile?.professional_details || {};

      // Convert onboarding preferences to profile learning_preferences field
      const learningPreferences = [];
      if (preferences.learningStyle === 'visual') learningPreferences.push('Visual learning');
      if (preferences.learningStyle === 'auditory') learningPreferences.push('Auditory learning');
      if (preferences.learningStyle === 'kinesthetic') learningPreferences.push('Hands-on practice');
      if (preferences.learningStyle === 'reading') learningPreferences.push('Reading/writing');

      const clientData = {
        subjects: subjects || [],  // From onboarding subjects step
        education_level: '',  // User can fill this in profile
        learning_goals: [],  // User can fill this in profile
        learning_preferences: learningPreferences,
        budget_range: '',  // User can fill this in profile
        sessions_per_week: '',  // User can fill this in profile
        session_duration: '',  // User can fill this in profile
        special_needs: [],  // User can fill this in profile
        additional_info: preferences.location ? `Preferred location: ${preferences.location}` : '',
        availability: selectedAvailability,  // From onboarding availability step
        unavailability: null,
      };

      // Save to professional_details.client (auto-populates profile form)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          professional_details: {
            ...currentProfessionalDetails,
            client: clientData
          }
        })
        .eq('id', user?.id);

      if (profileError) {
        console.error('[ClientOnboardingWizard] Error saving professional_details:', profileError);
        throw profileError;
      }

      console.log('[ClientOnboardingWizard] ✓ Saved to professional_details.client');

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

      // Clear draft since client-specific onboarding is complete
      console.log('[ClientOnboardingWizard] Clearing draft...');
      await clearDraft(user?.id, DRAFT_KEY);
      console.log('[ClientOnboardingWizard] ✓ Draft cleared');

      // NOW trigger redirect after all database operations complete successfully
      console.log('[ClientOnboardingWizard] 🚀 All data saved, calling onComplete() to redirect...');
      onComplete();
      console.log('[ClientOnboardingWizard] ✓ onComplete() called - should redirect to dashboard');

    } catch (error) {
      console.error('[ClientOnboardingWizard] ❌ Database save error:', error);
      alert('Failed to save onboarding data. Please try again.');
    } finally {
      setIsLoading(false);
    }

    console.log('[ClientOnboardingWizard] handleAvailabilityNext COMPLETE');
    console.log('[ClientOnboardingWizard] ========================================');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'personalInfo':
        return (
          <ClientPersonalInfoStep
            onNext={handlePersonalInfoSubmit}
            onSkip={handleSkipHandler}
            isLoading={isLoading}
          />
        );
      case 'subjects':
        return <ClientSubjectSelectionStep onNext={handleSubjectsNext} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} initialSubjects={subjects} />;
      case 'preferences':
        return <ClientLearningPreferencesStep onNext={handlePreferencesNext} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
      case 'availability':
        return <ClientAvailabilityStep onNext={handleAvailabilityNext} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
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

