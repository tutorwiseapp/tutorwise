'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import TutorWelcomeStep from './TutorWelcomeStep';
import TutorSubjectSelectionStep from './TutorSubjectSelectionStep';
import TutorQualificationsStep, { QualificationsData } from './TutorQualificationsStep';
import TutorAvailabilityStep, { AvailabilityData } from './TutorAvailabilityStep';
import CompletionStep from '../steps/CompletionStep';
import styles from '../OnboardingWizard.module.css';

type TutorOnboardingStep = 'welcome' | 'subjects' | 'qualifications' | 'availability' | 'completion';

interface TutorOnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: string;
}

const TutorOnboardingWizard: React.FC<TutorOnboardingWizardProps> = ({
  onComplete,
  onSkip,
  mode = 'modal',
  initialStep
}) => {
  const { profile, user } = useUserProfile();
  const [currentStep, setCurrentStep] = useState<TutorOnboardingStep>('welcome');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState<QualificationsData | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Auto-save functionality
  const updateOnboardingProgress = useCallback(async (step: TutorOnboardingStep, additionalData: any = {}) => {
    if (!user?.id) return;

    try {
      const updatedProgress = {
        current_step: step,
        last_updated: new Date().toISOString(),
        tutor_data: {
          subjects: selectedSubjects,
          qualifications,
          availability,
          ...additionalData
        }
      };

      await supabase
        .from('profiles')
        .update({ onboarding_progress: updatedProgress })
        .eq('id', user.id);

    } catch (err) {
      console.error('Error updating onboarding progress:', err);
    }
  }, [user?.id, selectedSubjects, qualifications, availability, supabase]);

  // Initialize step from URL or saved progress
  useEffect(() => {
    if (initialStep) {
      const validSteps: TutorOnboardingStep[] = ['welcome', 'subjects', 'qualifications', 'availability', 'completion'];
      if (validSteps.includes(initialStep as TutorOnboardingStep)) {
        setCurrentStep(initialStep as TutorOnboardingStep);
        return;
      }
    }

    // Try to resume from saved progress
    if (profile?.onboarding_progress?.current_step) {
      const savedStep = profile.onboarding_progress.current_step;
      if (savedStep && savedStep !== 'welcome') {
        setCurrentStep(savedStep as TutorOnboardingStep);
      }
    }
  }, [initialStep, profile]);

  // Step navigation handlers
  const handleWelcomeNext = () => {
    setCurrentStep('subjects');
    updateOnboardingProgress('subjects');
  };

  const handleSubjectsNext = (subjects: string[]) => {
    setSelectedSubjects(subjects);
    setCurrentStep('qualifications');
    updateOnboardingProgress('qualifications', { subjects });
  };

  const handleQualificationsNext = (quals: QualificationsData) => {
    setQualifications(quals);
    setCurrentStep('availability');
    updateOnboardingProgress('availability', { qualifications: quals });
  };

  const handleAvailabilityNext = (avail: AvailabilityData) => {
    setAvailability(avail);
    setCurrentStep('completion');
    updateOnboardingProgress('completion', { availability: avail });
  };

  const handleSkip = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_progress: {
            onboarding_completed: true,
            skipped: true,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', user.id);

      onSkip?.();
    } catch (err) {
      console.error('Error skipping onboarding:', err);
      setError('Failed to skip onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Update user's roles to include provider
      const currentRoles = profile?.roles || [];
      const updatedRoles = [...new Set([...currentRoles, 'provider'])];

      // Single atomic update - roles, active_role, and onboarding completion together
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          roles: updatedRoles,
          active_role: 'provider', // Set provider as active role
          onboarding_progress: {
            onboarding_completed: true,
            completed_at: new Date().toISOString(),
            selected_roles: ['provider'],
            tutor_data: {
              subjects: selectedSubjects,
              qualifications,
              availability
            }
          }
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Save tutor details to role_details table
      // NOTE FOR CLAUDE CODE & CAS: This saves the initial professional template data
      // that users can later edit in /account/professional-info
      if (selectedSubjects.length > 0 && qualifications && availability) {
        // NOTE: skill_levels left empty - tutors will set their teaching levels
        // in professional info form. This prevents assuming incorrect defaults.
        // Previous approach assumed GCSE/A-Level/Undergraduate which may not apply.

        const { error: detailsError } = await supabase
          .from('role_details')
          .upsert({
            profile_id: user.id,
            role_type: 'provider',
            // Core tutor information collected during onboarding
            subjects: selectedSubjects,
            teaching_experience: qualifications.experience,
            qualifications: [qualifications.education, ...qualifications.certifications],
            hourly_rate: availability.hourlyRate,
            availability: availability.availability, // Array of time slots
            teaching_methods: availability.sessionTypes, // e.g., ['one_on_one', 'online']
            specializations: qualifications.certifications || [],
            // Leave skill_levels empty - tutor sets in professional info
            skill_levels: {},
            // NOTE: created_at removed - database handles this automatically
            // Only update updated_at to avoid overwriting original creation timestamp
            updated_at: new Date().toISOString()
          });

        if (detailsError) {
          console.error('Error saving tutor details:', detailsError);
        }
      }

      console.log('Tutor onboarding completed successfully');
      onComplete?.();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Failed to complete onboarding. Please try again.');
      setIsLoading(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <TutorWelcomeStep
            onNext={handleWelcomeNext}
            onSkip={handleSkip}
            userName={profile?.first_name || profile?.display_name || 'there'}
          />
        );

      case 'subjects':
        return (
          <TutorSubjectSelectionStep
            onNext={handleSubjectsNext}
            onBack={() => setCurrentStep('welcome')}
            onSkip={handleSkip}
            isLoading={isLoading}
          />
        );

      case 'qualifications':
        return (
          <TutorQualificationsStep
            onNext={handleQualificationsNext}
            onBack={() => setCurrentStep('subjects')}
            onSkip={handleSkip}
            isLoading={isLoading}
          />
        );

      case 'availability':
        return (
          <TutorAvailabilityStep
            onNext={handleAvailabilityNext}
            onBack={() => setCurrentStep('qualifications')}
            onSkip={handleSkip}
            isLoading={isLoading}
          />
        );

      case 'completion':
        return (
          <CompletionStep
            selectedRoles={['provider']}
            onComplete={handleComplete}
            isLoading={isLoading}
          />
        );

      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  const getStepNumber = () => {
    switch (currentStep) {
      case 'welcome': return 1;
      case 'subjects': return 2;
      case 'qualifications': return 3;
      case 'availability': return 4;
      case 'completion': return 5;
      default: return 1;
    }
  };

  const renderProgressIndicator = () => {
    const stepNumber = getStepNumber();
    const totalSteps = 5;

    return (
      <div className={styles.wizardProgress}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const isActive = step === stepNumber;
          const isCompleted = step < stepNumber;

          return (
            <React.Fragment key={step}>
              <div
                className={`${styles.progressDot} ${
                  isActive ? styles.active : isCompleted ? styles.completed : ''
                }`}
              />
              {step < totalSteps && (
                <div
                  className={`${styles.progressSeparator} ${
                    isCompleted ? styles.active : ''
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className={mode === 'modal' ? styles.wizardOverlay : ''}>
      <div className={`${styles.wizardContainer} ${styles[mode]}`} role="dialog" aria-modal="true" aria-labelledby="tutor-onboarding-title">
        {renderProgressIndicator()}

        {error && (
          <div className={styles.errorMessage}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {renderCurrentStep()}
      </div>
    </div>
  );
};

export default TutorOnboardingWizard;
