// apps/web/src/app/components/onboarding/OnboardingWizard.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import { OnboardingProgress, RoleDetails, Role, OnboardingStep } from '@/types';
import WelcomeAndRoleSelectionStep from './steps/WelcomeAndRoleSelectionStep';
import CompletionStep from './steps/CompletionStep';
import TutorOnboardingWizard from './tutor/TutorOnboardingWizard';
import ClientOnboardingWizard from './client/ClientOnboardingWizard';
import AgentOnboardingWizard from './agent/AgentOnboardingWizard';
import styles from './OnboardingWizard.module.css';

interface OnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: string;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip, mode = 'modal', initialStep }) => {
  const { profile, user } = useUserProfile();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome-and-role-selection');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [roleDetailsData, setRoleDetailsData] = useState<Record<string, Partial<RoleDetails>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const updateOnboardingProgress = useCallback(async (step: OnboardingStep, additionalData: Partial<OnboardingProgress> = {}, retryCount = 0) => {
    if (!user?.id) return;

    const maxRetries = 3;

    try {
      const currentProgress: Partial<OnboardingProgress> = profile?.onboarding_progress || {};

      const updatedProgress: Partial<OnboardingProgress> = {
        ...currentProgress,
        current_step: step,
        completed_steps: [
          ...(currentProgress.completed_steps || []).filter((s: string) => s !== currentStep),
          currentStep
        ].filter(Boolean) as string[],
        last_updated: new Date().toISOString(),
        ...additionalData
      };

      if (Object.keys(roleDetailsData).length > 0) {
        updatedProgress.role_specific_progress = {
          ...(updatedProgress.role_specific_progress || {}),
          roleDetailsProgress: roleDetailsData,
          selected_roles: selectedRoles
        };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_progress: updatedProgress })
        .eq('id', user.id);

      if (error) throw error;

      if (error) {
        setError(null);
      }

    } catch (err) {
      console.error(`Error updating onboarding progress (attempt ${retryCount + 1}):`, err);

      if (retryCount < maxRetries) {
        setTimeout(() => {
          updateOnboardingProgress(step, additionalData, retryCount + 1);
        }, (retryCount + 1) * 1000);
      } else {
        setError('Failed to save progress after multiple attempts. Your progress may be lost if you navigate away. Please try again.');
      }
    }
  }, [user?.id, profile, roleDetailsData, selectedRoles, supabase, currentStep]);

  useEffect(() => {
    if (!user?.id || !currentStep) return;

    const autoSaveInterval = setInterval(() => {
      updateOnboardingProgress(currentStep, {
        last_updated: new Date().toISOString()
      });
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [user?.id, currentStep, updateOnboardingProgress]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user?.id || !currentStep) return;
      
      const progress: OnboardingProgress = {
        onboarding_completed: false,
        current_step: currentStep,
        last_updated: new Date().toISOString(),
        abandoned_at: new Date().toISOString(),
        role_specific_progress: {
          roleDetailsProgress: roleDetailsData,
          selected_roles: selectedRoles
        }
      };

      const url = '/api/save-onboarding-progress';
      const data = JSON.stringify({ userId: user.id, progress });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, data);
      } else {
        updateOnboardingProgress(currentStep);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.id, currentStep, roleDetailsData, selectedRoles, updateOnboardingProgress]);

  useEffect(() => {
    if (!profile || !user) return;

    // If we are already transitioning to the role-specific step,
    // do not re-initialize state from the potentially stale profile data.
    if (currentStep === 'role-specific-details') {
      console.log('[OnboardingWizard] useEffect: Skipping state reset during role transition.');
      return;
    }

    try {
      const progress = profile.onboarding_progress;

      if (progress?.onboarding_completed) {
        setCurrentStep('completion');
        return;
      }

      if (initialStep) {
        const validSteps: OnboardingStep[] = ['welcome-and-role-selection', 'role-specific-details', 'completion'];
        if (validSteps.includes(initialStep as OnboardingStep)) {
          setCurrentStep(initialStep as OnboardingStep);
          return;
        }
      }

      if (progress?.current_step) {
        const validSteps: OnboardingStep[] = ['welcome-and-role-selection', 'role-specific-details', 'completion'];
        if (validSteps.includes(progress.current_step as OnboardingStep)) {
          setCurrentStep(progress.current_step as OnboardingStep);
        } else {
          setCurrentStep('welcome-and-role-selection');
        }
      }

      if (profile.roles && profile.roles.length > 0) {
        setSelectedRoles(profile.roles);

        if (!progress?.current_step) {
          setCurrentStep('welcome-and-role-selection');
        }
      }

      if (progress?.role_specific_progress?.roleDetailsProgress) {
        setRoleDetailsData(progress.role_specific_progress.roleDetailsProgress);
      }

    } catch (error) {
      console.error('Error initializing onboarding state:', error);
      setCurrentStep('welcome-and-role-selection');
      setSelectedRoles([]);
      setRoleDetailsData({});
      setError('There was an issue loading your progress. Starting fresh.');
    }
  }, [profile, user, initialStep, currentStep]);

  const handleBack = async () => {
    switch (currentStep) {
      case 'role-specific-details':
        setCurrentStep('welcome-and-role-selection');
        try {
          await updateOnboardingProgress('welcome-and-role-selection');
        } catch (error) {
          console.warn('Failed to save progress, but continuing with navigation:', error);
        }
        break;
      case 'completion':
        break;
      default:
        break;
    }
  };

  const handleRoleSelection = async (roles: Role[]) => {
    if (!user?.id || roles.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ roles })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setSelectedRoles(roles);
      setCurrentStep('role-specific-details');

      await updateOnboardingProgress('role-specific-details', {
        onboarding_completed: false,
        role_specific_progress: {
          selected_roles: roles,
        }
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

    setRoleDetailsData(prev => ({
      ...prev,
      [currentRole]: { ...roleData, role_type: currentRole }
    }));

    if (currentRoleIndex < selectedRoles.length - 1) {
      setCurrentRoleIndex(prev => prev + 1);
    } else {
      await saveAllRoleDetails();
    }
  };

  const saveAllRoleDetails = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const roleDetailsToInsert = Object.entries(roleDetailsData).map(([roleType, data]) => ({
        profile_id: user.id,
        role_type: roleType as Role,
        ...data
      }));

      const { error: roleDetailsError } = await supabase
        .from('role_details')
        .insert(roleDetailsToInsert);

      if (roleDetailsError) throw roleDetailsError;

      await updateOnboardingProgress('completion', {
        onboarding_completed: true,
        role_specific_progress: {
          selected_roles: selectedRoles,
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

  const handleSubWizardComplete = async () => {
    console.log('[OnboardingWizard] handleSubWizardComplete called');
    console.log('[OnboardingWizard] Current step before completion:', currentStep);
    console.log('[OnboardingWizard] Setting step to completion...');

    setCurrentStep('completion');
    console.log('[OnboardingWizard] Step set to completion, updating progress...');

    try {
      await updateOnboardingProgress('completion', {
        onboarding_completed: true,
        completed_at: new Date().toISOString()
      });
      console.log('[OnboardingWizard] Progress updated successfully');
    } catch (error) {
      console.error('[OnboardingWizard] Error updating progress:', error);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) {
      console.error('No user ID found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!selectedRoles || selectedRoles.length === 0) {
        throw new Error('Cannot complete onboarding without selecting at least one role');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          roles: selectedRoles,
          active_role: selectedRoles[0],
          onboarding_progress: {
            ...(profile?.onboarding_progress || {}),
            onboarding_completed: true,
            completed_at: new Date().toISOString(),
            selected_roles: selectedRoles,
            completed_steps: ['welcome-and-role-selection', 'role-specific-details', 'completion']
          }
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Onboarding completion error:', updateError);
        throw updateError;
      }

      setIsLoading(false);

      if (onComplete) {
        onComplete();
      } else {
        console.warn('No onComplete callback provided');
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Failed to complete onboarding. Please try again.');
      setIsLoading(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome-and-role-selection':
        return (
          <WelcomeAndRoleSelectionStep
            selectedRoles={selectedRoles}
            onNext={handleRoleSelection}
            onSkip={handleSkip}
            isLoading={isLoading}
            userName={profile?.first_name || profile?.full_name || ''}
          />
        );

      case 'role-specific-details':
        // Render the appropriate specialized wizard based on selected role
        // Use else if to ensure only one wizard is rendered and prioritize 'seeker'
        if (selectedRoles.includes('seeker')) {
          console.log('[OnboardingWizard] Rendering ClientOnboardingWizard');
          return (
            <ClientOnboardingWizard
              onComplete={handleSubWizardComplete}
              onSkip={handleSkip}
              mode="fullPage"
            />
          );
        } else if (selectedRoles.includes('provider')) {
          console.log('[OnboardingWizard] Rendering TutorOnboardingWizard');
          return (
            <TutorOnboardingWizard
              onComplete={handleSubWizardComplete}
              onSkip={handleSkip}
              mode="fullPage"
            />
          );
        } else if (selectedRoles.includes('agent')) {
          console.log('[OnboardingWizard] Rendering AgentOnboardingWizard');
          return (
            <AgentOnboardingWizard
              onComplete={handleSubWizardComplete}
              onSkip={handleSkip}
              mode="fullPage"
            />
          );
        }
        // If no recognized role somehow, skip to completion (existing fallback)
        console.warn('[OnboardingWizard] No recognized role found for role-specific-details, skipping to completion.');
        handleSubWizardComplete();
        return null;

      case 'completion':
        return (
          <CompletionStep
            selectedRoles={selectedRoles}
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
      case 'welcome-and-role-selection': return 1;
      case 'role-specific-details': return 2;
      case 'completion': return 3;
      default: return 1;
    }
  };

  const renderProgressIndicator = () => {
    const stepNumber = getStepNumber();
    const totalSteps = 3;

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
