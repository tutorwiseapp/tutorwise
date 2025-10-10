'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  initialStep?: string;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip, mode = 'modal', initialStep }) => {
  const { profile, user } = useUserProfile();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedRoles, setSelectedRoles] = useState<('agent' | 'seeker' | 'provider')[]>([]);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [roleDetailsData, setRoleDetailsData] = useState<Record<string, Partial<RoleDetails>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Define updateOnboardingProgress function first
  const updateOnboardingProgress = useCallback(async (step: OnboardingStep, additionalData: Partial<OnboardingProgress> = {}, retryCount = 0) => {
    if (!user?.id) return;

    const maxRetries = 3;

    try {
      const currentProgress = profile?.onboarding_progress || {};

      // Build comprehensive progress update
      const updatedProgress = {
        ...currentProgress,
        current_step: step,
        completed_steps: [
          ...(currentProgress.completed_steps || []).filter(s => s !== currentStep), // Remove current to avoid duplicates
          currentStep // Add current step to completed
        ].filter(Boolean), // Remove any empty values
        last_updated: new Date().toISOString(),
        ...additionalData
      };

      // Save progress with role details if available
      if (Object.keys(roleDetailsData).length > 0) {
        updatedProgress.role_specific_progress = {
          ...updatedProgress.role_specific_progress,
          roleDetailsProgress: roleDetailsData,
          selectedRoles: selectedRoles
        };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_progress: updatedProgress })
        .eq('id', user.id);

      if (error) throw error;

      console.log(`Onboarding progress saved: ${step}`);

      // Clear any existing errors on successful save
      if (error) {
        setError(null);
      }

    } catch (err) {
      console.error(`Error updating onboarding progress (attempt ${retryCount + 1}):`, err);

      // Retry logic for network failures
      if (retryCount < maxRetries) {
        console.log(`Retrying in ${(retryCount + 1) * 1000}ms...`);
        setTimeout(() => {
          updateOnboardingProgress(step, additionalData, retryCount + 1);
        }, (retryCount + 1) * 1000);
      } else {
        setError('Failed to save progress after multiple attempts. Your progress may be lost if you navigate away. Please try again.');
      }
    }
  }, [user?.id, profile, roleDetailsData, selectedRoles, supabase, currentStep]);

  // Periodic auto-save functionality to prevent data loss
  useEffect(() => {
    if (!user?.id || !currentStep) return;

    const autoSaveInterval = setInterval(() => {
      console.log('Auto-save: Periodic save triggered');
      updateOnboardingProgress(currentStep, {
        last_auto_save: new Date().toISOString()
      });
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [user?.id, currentStep, updateOnboardingProgress]);

  // Save progress on page unload (crash/abandonment recovery)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user?.id || !currentStep) return;

      console.log('Auto-save: Page unload detected, saving progress');
      // Use navigator.sendBeacon for reliable save on page unload
      const progress = {
        current_step: currentStep,
        last_updated: new Date().toISOString(),
        abandoned_at: new Date().toISOString(),
        role_specific_progress: {
          roleDetailsProgress: roleDetailsData,
          selectedRoles: selectedRoles
        }
      };

      const url = '/api/save-onboarding-progress';
      const data = JSON.stringify({ userId: user.id, progress });

      // Try sendBeacon first (most reliable for page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, data);
      } else {
        // Fallback for browsers without sendBeacon
        updateOnboardingProgress(currentStep);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.id, currentStep, roleDetailsData, selectedRoles, updateOnboardingProgress]);

  // Initialize step based on URL parameter or existing progress with robust error handling
  useEffect(() => {
    if (!profile || !user) return;

    try {
      const progress = profile.onboarding_progress;

      // If onboarding is already completed, go to completion step
      if (progress?.onboarding_completed) {
        setCurrentStep('completion');
        return;
      }

      // Priority 1: Use initialStep from URL (middleware auto-resume)
      if (initialStep) {
        const validSteps: OnboardingStep[] = ['welcome', 'role-selection', 'role-details', 'completion'];
        if (validSteps.includes(initialStep as OnboardingStep)) {
          console.log(`Auto-resuming onboarding from URL step: ${initialStep}`);
          setCurrentStep(initialStep as OnboardingStep);
          return;
        }
      }

      // Priority 2: Restore progress from last session (fallback)
      if (progress?.current_step) {
        const validSteps: OnboardingStep[] = ['welcome', 'role-selection', 'role-details', 'completion'];
        if (validSteps.includes(progress.current_step as OnboardingStep)) {
          console.log(`Restoring onboarding from saved progress: ${progress.current_step}`);
          setCurrentStep(progress.current_step as OnboardingStep);
        } else {
          // Corrupted state - reset to welcome
          console.warn('Invalid onboarding step detected, resetting to welcome');
          setCurrentStep('welcome');
        }
      }

      // Restore selected roles if they exist
      if (profile.roles && profile.roles.length > 0) {
        setSelectedRoles(profile.roles);

        // For the new inspirational onboarding, always start with welcome step
        // Users should experience the full "Believe. Learn. Succeed." journey
        if (!progress?.current_step) {
          setCurrentStep('welcome');
        }
      }

      // Restore role details progress if exists
      if (progress?.role_specific_progress?.roleDetailsProgress) {
        setRoleDetailsData(progress.role_specific_progress.roleDetailsProgress);
      }

    } catch (error) {
      console.error('Error initializing onboarding state:', error);
      // Fallback to clean state
      setCurrentStep('welcome');
      setSelectedRoles([]);
      setRoleDetailsData({});
      setError('There was an issue loading your progress. Starting fresh.');
    }
  }, [profile, user, initialStep]);

  const handleWelcomeNext = async () => {
    console.log('Auto-save: Moving to role-selection step');
    setCurrentStep('role-selection');
    try {
      await updateOnboardingProgress('role-selection');
    } catch (error) {
      console.warn('Failed to save progress, but continuing with onboarding:', error);
    }
  };

  const handleBack = async () => {
    switch (currentStep) {
      case 'role-selection':
        setCurrentStep('welcome');
        try {
          await updateOnboardingProgress('welcome');
        } catch (error) {
          console.warn('Failed to save progress, but continuing with navigation:', error);
        }
        break;
      case 'role-details':
        setCurrentStep('role-selection');
        try {
          await updateOnboardingProgress('role-selection');
        } catch (error) {
          console.warn('Failed to save progress, but continuing with navigation:', error);
        }
        break;
      case 'completion':
        // Don't allow going back from completion
        break;
      default:
        break;
    }
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
      setCurrentStep('completion');

      await updateOnboardingProgress('completion', {
        onboarding_completed: true,
        role_specific_progress: {
          selected_roles: roles,
          completed_at: new Date().toISOString()
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

  const handleComplete = async () => {
    if (!user?.id) {
      console.error('No user ID found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mark onboarding as completed in database
      const { error: progressError } = await supabase
        .from('profiles')
        .update({
          onboarding_progress: {
            onboarding_completed: true,
            completed_at: new Date().toISOString(),
            selected_roles: selectedRoles,
            completed_steps: ['welcome', 'role-selection', 'completion']
          }
        })
        .eq('id', user.id);

      if (progressError) {
        console.error('Progress update error:', progressError);
        throw progressError;
      }

      // Update user's roles in the profile
      const { error: rolesError } = await supabase
        .from('profiles')
        .update({
          roles: selectedRoles
        })
        .eq('id', user.id);

      if (rolesError) {
        console.error('Roles update error:', rolesError);
        throw rolesError;
      }

      console.log('Onboarding completed successfully');
      setIsLoading(false);

      // Call the completion callback to navigate to dashboard
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
            onBack={handleBack}
            onSkip={handleSkip}
            isLoading={isLoading}
          />
        );

      case 'role-details':
        // Skip role-details for now - our new design focuses on inspiration over detailed forms
        // Automatically complete onboarding after subject selection
        if (selectedRoles.length > 0) {
          setCurrentStep('completion');
          updateOnboardingProgress('completion', {
            onboarding_completed: true,
            role_specific_progress: {
              selected_roles: selectedRoles,
              completed_at: new Date().toISOString()
            }
          });
        }
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
    return null; // Don't show onboarding if user is not authenticated
  }

  const getStepNumber = () => {
    switch (currentStep) {
      case 'welcome': return 1;
      case 'role-selection': return 2;
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