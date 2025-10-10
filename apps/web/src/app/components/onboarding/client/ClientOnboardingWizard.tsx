'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import ClientWelcomeStep from './ClientWelcomeStep';
import ClientSubjectSelectionStep from './ClientSubjectSelectionStep';
import ClientLearningPreferencesStep from './ClientLearningPreferencesStep';
import CompletionStep from '../steps/CompletionStep';

interface ClientOnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

type ClientStep = 'welcome' | 'subjects' | 'preferences' | 'completion';

export interface LearningPreferencesData {
  educationLevel: string;
  learningGoals: string[];
  learningPreferences: string[];
  budgetMin: string;
  budgetMax: string;
  sessionsPerWeek: string;
  sessionDuration: string;
  additionalInfo: string;
}

const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
  onComplete,
  onSkip
}) => {
  const { user, profile } = useUserProfile();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<ClientStep>('welcome');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<LearningPreferencesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing progress if any
  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('role_details')
          .select('*')
          .eq('profile_id', user.id)
          .eq('role_type', 'seeker')
          .single();

        if (data && !error) {
          // Restore progress
          if (data.subjects) setSelectedSubjects(data.subjects);
          if (data.education_level || data.learning_goals) {
            setPreferences({
              educationLevel: data.education_level || '',
              learningGoals: data.learning_goals || [],
              learningPreferences: data.learning_preferences || [],
              budgetMin: data.budget_range?.split('-')[0] || '',
              budgetMax: data.budget_range?.split('-')[1] || '',
              sessionsPerWeek: data.sessions_per_week || '',
              sessionDuration: data.session_duration || '',
              additionalInfo: data.additional_info || ''
            });
          }
        }
      } catch (err) {
        console.error('Error loading client onboarding progress:', err);
      }
    };

    loadProgress();
  }, [user, supabase]);

  const handleWelcomeNext = () => {
    setCurrentStep('subjects');
  };

  const handleSubjectsNext = (subjects: string[]) => {
    setSelectedSubjects(subjects);
    setCurrentStep('preferences');
  };

  const handleSubjectsBack = () => {
    setCurrentStep('welcome');
  };

  const handlePreferencesNext = (prefs: LearningPreferencesData) => {
    setPreferences(prefs);
    handleComplete(prefs);
  };

  const handlePreferencesBack = () => {
    setCurrentStep('subjects');
  };

  const handleSkip = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Mark onboarding as skipped
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

  const handleComplete = async (prefs: LearningPreferencesData) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Update user's roles to include seeker
      const currentRoles = profile?.roles || [];
      const updatedRoles = [...new Set([...currentRoles, 'seeker'])];

      // Single atomic update - roles, active_role, and onboarding completion together
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          roles: updatedRoles,
          active_role: 'seeker', // Set seeker as active role
          onboarding_progress: {
            onboarding_completed: true,
            completed_at: new Date().toISOString(),
            selected_roles: ['seeker'],
            client_data: {
              subjects: selectedSubjects,
              preferences: prefs
            }
          }
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Save client details to role_details table
      // NOTE FOR CLAUDE CODE & CAS: This saves the initial learning profile data
      // that clients can later edit in /account/professional-info
      if (selectedSubjects.length > 0) {
        const budgetRange = prefs.budgetMin && prefs.budgetMax
          ? `${prefs.budgetMin}-${prefs.budgetMax}`
          : undefined;

        const { error: detailsError } = await supabase
          .from('role_details')
          .upsert({
            profile_id: user.id,
            role_type: 'seeker',
            // Core client/seeker information collected during onboarding
            subjects: selectedSubjects, // Array of subjects they want to learn
            education_level: prefs.educationLevel, // Current education level
            learning_goals: prefs.learningGoals, // Array of goals (e.g., "exam_prep", "skill_building")
            learning_preferences: prefs.learningPreferences, // Array of preferences (e.g., "online", "one_on_one")
            budget_range: budgetRange, // String like "20-40" (hourly rate range)
            sessions_per_week: prefs.sessionsPerWeek, // String like "1-2", "3-4"
            session_duration: prefs.sessionDuration, // String like "30min", "1hour"
            additional_info: prefs.additionalInfo, // Free-text additional requirements
            // NOTE: created_at removed - database handles this automatically via default value
            // Only update updated_at to avoid overwriting original creation timestamp
            updated_at: new Date().toISOString()
          });

        if (detailsError) {
          console.error('Error saving client details:', detailsError);
        }
      }

      console.log('Client onboarding completed successfully');
      setCurrentStep('completion');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Failed to complete onboarding. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCompletionContinue = () => {
    onComplete?.();
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <ClientWelcomeStep
            onNext={handleWelcomeNext}
            onSkip={handleSkip}
            userName={profile?.first_name || profile?.display_name || 'there'}
          />
        );

      case 'subjects':
        return (
          <ClientSubjectSelectionStep
            onNext={handleSubjectsNext}
            onBack={handleSubjectsBack}
            onSkip={handleSkip}
            isLoading={isLoading}
            initialSubjects={selectedSubjects}
          />
        );

      case 'preferences':
        return (
          <ClientLearningPreferencesStep
            onNext={handlePreferencesNext}
            onBack={handlePreferencesBack}
            onSkip={handleSkip}
            isLoading={isLoading}
            initialPreferences={preferences}
          />
        );

      case 'completion':
        return (
          <CompletionStep
            selectedRoles={['seeker']}
            onComplete={handleCompletionContinue}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee',
          color: '#c33',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}
      {renderCurrentStep()}
    </div>
  );
};

export default ClientOnboardingWizard;
