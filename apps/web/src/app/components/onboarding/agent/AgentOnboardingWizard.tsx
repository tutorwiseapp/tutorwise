'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import AgentWelcomeStep from './AgentWelcomeStep';
import AgentServicesStep from './AgentServicesStep';
import AgentDetailsStep, { AgencyDetailsData } from './AgentDetailsStep';
import AgentCapacityStep, { CapacityData } from './AgentCapacityStep';
import CompletionStep from '../steps/CompletionStep';
import styles from '../OnboardingWizard.module.css';

type AgentOnboardingStep = 'welcome' | 'services' | 'details' | 'capacity' | 'completion';

interface AgentOnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: string;
}

const AgentOnboardingWizard: React.FC<AgentOnboardingWizardProps> = ({
  onComplete,
  onSkip,
  mode = 'modal',
  initialStep
}) => {
  const { profile, user } = useUserProfile();
  const [currentStep, setCurrentStep] = useState<AgentOnboardingStep>('welcome');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [agencyDetails, setAgencyDetails] = useState<AgencyDetailsData | null>(null);
  const [capacity, setCapacity] = useState<CapacityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Auto-save functionality
  const updateOnboardingProgress = useCallback(async (step: AgentOnboardingStep, additionalData: any = {}) => {
    if (!user?.id) return;

    try {
      const updatedProgress = {
        current_step: step,
        last_updated: new Date().toISOString(),
        agent_data: {
          services: selectedServices,
          agencyDetails,
          capacity,
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
  }, [user?.id, selectedServices, agencyDetails, capacity, supabase]);

  // Initialize step from URL or saved progress
  useEffect(() => {
    if (initialStep) {
      const validSteps: AgentOnboardingStep[] = ['welcome', 'services', 'details', 'capacity', 'completion'];
      if (validSteps.includes(initialStep as AgentOnboardingStep)) {
        setCurrentStep(initialStep as AgentOnboardingStep);
        return;
      }
    }

    // Try to resume from saved progress
    if (profile?.onboarding_progress?.current_step) {
      const savedStep = profile.onboarding_progress.current_step;
      if (savedStep && savedStep !== 'welcome') {
        setCurrentStep(savedStep as AgentOnboardingStep);
      }
    }
  }, [initialStep, profile]);

  // Step navigation handlers
  const handleWelcomeNext = () => {
    setCurrentStep('services');
    updateOnboardingProgress('services');
  };

  const handleServicesNext = (services: string[]) => {
    setSelectedServices(services);
    setCurrentStep('details');
    updateOnboardingProgress('details', { services });
  };

  const handleDetailsNext = (details: AgencyDetailsData) => {
    setAgencyDetails(details);
    setCurrentStep('capacity');
    updateOnboardingProgress('capacity', { agencyDetails: details });
  };

  const handleCapacityNext = (cap: CapacityData) => {
    setCapacity(cap);
    setCurrentStep('completion');
    updateOnboardingProgress('completion', { capacity: cap });
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
      // Update user's roles to include agent
      const currentRoles = profile?.roles || [];
      const updatedRoles = [...new Set([...currentRoles, 'agent'])];

      // Single atomic update - roles, active_role, and onboarding completion together
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          roles: updatedRoles,
          active_role: 'agent', // Set agent as active role
          onboarding_progress: {
            onboarding_completed: true,
            completed_at: new Date().toISOString(),
            selected_roles: ['agent'],
            agent_data: {
              services: selectedServices,
              agencyDetails,
              capacity
            }
          }
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Save agent details to role_details table
      // NOTE FOR CLAUDE CODE & CAS: This saves the initial agency profile data
      // that agents can later edit in /account/professional-info
      if (selectedServices.length > 0 && agencyDetails && capacity) {
        const { error: detailsError } = await supabase
          .from('role_details')
          .upsert({
            profile_id: user.id,
            role_type: 'agent',
            // Core agency information collected during onboarding
            agency_name: agencyDetails.agencyName,
            number_of_tutors: agencyDetails.agencySize, // e.g., "1-5", "6-10"
            years_in_business: agencyDetails.yearsInBusiness,
            description: agencyDetails.description,
            services: selectedServices, // Array of services offered
            commission_rate: capacity.commissionRate || undefined, // Percentage number
            coverage_areas: capacity.serviceAreas, // Geographic regions
            // NOTE: Fields below not collected in onboarding - agents set in professional info
            // Removed empty arrays to avoid confusion. If field doesn't exist, it's null/undefined
            // which clearly indicates "not set" vs empty array which could mean "none"
            // subject_specializations: left unset
            // education_levels: left unset
            // certifications: left unset
            // NOTE: created_at removed - database handles this automatically via default value
            // Only update updated_at to avoid overwriting original creation timestamp
            updated_at: new Date().toISOString()
          });

        if (detailsError) {
          console.error('Error saving agent details:', detailsError);
        }
      }

      console.log('Agent onboarding completed successfully');
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
          <AgentWelcomeStep
            onNext={handleWelcomeNext}
            onSkip={handleSkip}
            userName={profile?.first_name || profile?.display_name || 'there'}
          />
        );

      case 'services':
        return (
          <AgentServicesStep
            onNext={handleServicesNext}
            onBack={() => setCurrentStep('welcome')}
            onSkip={handleSkip}
            isLoading={isLoading}
          />
        );

      case 'details':
        return (
          <AgentDetailsStep
            onNext={handleDetailsNext}
            onBack={() => setCurrentStep('services')}
            onSkip={handleSkip}
            isLoading={isLoading}
          />
        );

      case 'capacity':
        return (
          <AgentCapacityStep
            onNext={handleCapacityNext}
            onBack={() => setCurrentStep('details')}
            onSkip={handleSkip}
            isLoading={isLoading}
          />
        );

      case 'completion':
        return (
          <CompletionStep
            selectedRoles={['agent']}
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
      case 'services': return 2;
      case 'details': return 3;
      case 'capacity': return 4;
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
      <div className={`${styles.wizardContainer} ${styles[mode]}`} role="dialog" aria-modal="true" aria-labelledby="agent-onboarding-title">
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

export default AgentOnboardingWizard;
