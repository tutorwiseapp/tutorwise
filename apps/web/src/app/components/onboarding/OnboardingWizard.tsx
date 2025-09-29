'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import { OnboardingProgress, RoleDetails } from '@/types';
import WelcomeStep from './steps/WelcomeStep';
import RoleSelectionStep from './steps/RoleSelectionStep';
import RoleDetailsStep from './steps/RoleDetailsStep';
import CompletionStep from './steps/CompletionStep';

type OnboardingStep = 'welcome' | 'role-selection' | 'role-details' | 'completion';

interface OnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 m-6 mb-0">
            <div className="flex">
              <div className="text-red-800">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {renderCurrentStep()}
      </div>
    </div>
  );
};

export default OnboardingWizard;