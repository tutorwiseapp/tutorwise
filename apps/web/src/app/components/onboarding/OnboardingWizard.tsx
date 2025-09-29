'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import { OnboardingProgress, RoleDetails } from '@/types';
import WelcomeStep from './steps/WelcomeStep';
import RoleSelectionStep from './steps/RoleSelectionStep';
import RoleDetailsStep from './steps/RoleDetailsStep';
import CompletionStep from './steps/CompletionStep';
import styles from './OnboardingWizard.module.css';

type OnboardingStep = 'welcome' | 'role-selection' | 'role-details' | 'completion';

interface OnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip, mode = 'modal' }) => {
  const { profile, user } = useUserProfile();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedRoles, setSelectedRoles] = useState<('agent' | 'seeker' | 'provider')[]>([]);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [roleDetailsData, setRoleDetailsData] = useState<Record<string, Partial<RoleDetails>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Initialize step based on existing progress
  useEffect(() => {
    if (profile?.onboarding_progress?.current_step) {
      setCurrentStep(profile.onboarding_progress.current_step as OnboardingStep);
    }
    if (profile?.roles && profile.roles.length > 0) {
      setSelectedRoles(profile.roles);
    }
  }, [profile]);

  const updateOnboardingProgress = async (step: OnboardingStep, additionalData: Partial<OnboardingProgress> = {}) => {
    if (!user?.id) return;

    try {
      const currentProgress = profile?.onboarding_progress || {};
      const updatedProgress = {
        ...currentProgress,
        current_step: step,
        completed_steps: [...(currentProgress.completed_steps || []), currentStep],
        ...additionalData
      };

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_progress: updatedProgress })
        .eq('id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating onboarding progress:', err);
      setError('Failed to save progress. Please try again.');
    }
  };

  const handleWelcomeNext = () => {
    setCurrentStep('role-selection');
    updateOnboardingProgress('role-selection');
  };

  const handleRoleSelection = async (roles: ('agent' | 'seeker' | 'provider')[]) => {
    if (!user?.id || roles.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Update profile with selected roles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ roles })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setSelectedRoles(roles);
      setCurrentStep('role-details');
      setCurrentRoleIndex(0);

      await updateOnboardingProgress('role-details', {
        role_specific_progress: { selected_roles: roles }
      });
    } catch (err) {
      console.error('Error saving role selection:', err);
      setError('Failed to save role selection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleDetailsNext = async (roleData: Partial<RoleDetails>) => {
    const currentRole = selectedRoles[currentRoleIndex];

    // Store role details data
    setRoleDetailsData(prev => ({
      ...prev,
      [currentRole]: { ...roleData, role_type: currentRole }
    }));

    // Move to next role or completion
    if (currentRoleIndex < selectedRoles.length - 1) {
      setCurrentRoleIndex(prev => prev + 1);
    } else {
      // All roles completed, save to database and complete onboarding
      await saveAllRoleDetails();
    }
  };

  const saveAllRoleDetails = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Save all role details to the database
      const roleDetailsToInsert = Object.entries(roleDetailsData).map(([roleType, data]) => ({
        profile_id: user.id,
        role_type: roleType as 'agent' | 'seeker' | 'provider',
        ...data
      }));

      const { error: roleDetailsError } = await supabase
        .from('role_details')
        .insert(roleDetailsToInsert);

      if (roleDetailsError) throw roleDetailsError;

      // Mark onboarding as completed
      await updateOnboardingProgress('completion', {
        onboarding_completed: true,
        role_specific_progress: {
          selected_roles: selectedRoles,
          completed_at: new Date().toISOString()
        }
      });

      setCurrentStep('completion');
    } catch (err) {
      console.error('Error saving role details:', err);
      setError('Failed to complete onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user?.id) return;

    try {
      await updateOnboardingProgress('completion', {
        onboarding_completed: true,
        skipped: true
      });
      onSkip?.();
    } catch (err) {
      console.error('Error skipping onboarding:', err);
      setError('Failed to skip onboarding. Please try again.');
    }
  };

  const handleComplete = () => {
    onComplete?.();
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            onNext={handleWelcomeNext}
            onSkip={handleSkip}
            userName={profile?.first_name || profile?.display_name || 'there'}
          />
        );

      case 'role-selection':
        return (
          <RoleSelectionStep
            selectedRoles={selectedRoles}
            onNext={handleRoleSelection}
            onSkip={handleSkip}
            isLoading={isLoading}
          />
        );

      case 'role-details':
        const currentRole = selectedRoles[currentRoleIndex];
        return (
          <RoleDetailsStep
            role={currentRole}
            roleIndex={currentRoleIndex}
            totalRoles={selectedRoles.length}
            onNext={handleRoleDetailsNext}
            onSkip={handleSkip}
            isLoading={isLoading}
            initialData={roleDetailsData[currentRole]}
          />
        );

      case 'completion':
        return (
          <CompletionStep
            selectedRoles={selectedRoles}
            onComplete={handleComplete}
          />
        );

      default:
        return null;
    }
  };

  if (!user) {
    return null; // Don't show onboarding if user is not authenticated
  }

  const getStepNumber = () => {
    switch (currentStep) {
      case 'welcome': return 1;
      case 'role-selection': return 2;
      case 'role-details': return 3;
      case 'completion': return 4;
      default: return 1;
    }
  };

  const renderProgressIndicator = () => {
    const stepNumber = getStepNumber();
    const totalSteps = 4;

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
    <div
      className={`${styles.wizardContainer} ${mode === 'fullPage' ? styles.fullPage : styles.modal}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {renderProgressIndicator()}

      {error && (
        <div className={styles.errorMessage}>
          <p className={styles.errorText}>{error}</p>
        </div>
      )}

      {renderCurrentStep()}
    </div>
  );
};

export default OnboardingWizard;