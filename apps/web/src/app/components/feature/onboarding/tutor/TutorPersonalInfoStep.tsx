// apps/web/src/app/components/feature/onboarding/tutor/TutorPersonalInfoStep.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { format, parse } from 'date-fns';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { PersonalInfoData } from './TutorOnboardingWizard';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import { HubForm } from '@/app/components/hub/form/HubForm';
import InlineProgressBadge from '../shared/InlineProgressBadge';
import { useOnboardingAutoSave } from '@/hooks/useAutoSave';
import { useDifferentiatedSave } from '../shared/useDifferentiatedSave';
import { saveOnboardingProgress, getOnboardingProgress } from '@/lib/api/onboarding';

interface ProgressData {
  currentPoints: number;
  totalPoints: number;
  currentStepPoints: number;
  requiredPoints: number;
  steps: Array<{
    name: string;
    points: number;
    completed: boolean;
    current: boolean;
  }>;
}

interface TutorPersonalInfoStepProps {
  onNext: (data: PersonalInfoData) => void;
  onBack?: (data: PersonalInfoData) => void;
  isLoading?: boolean;
  userRole?: 'tutor' | 'agent' | 'client';
  progressData?: ProgressData;
}

const TutorPersonalInfoStep: React.FC<TutorPersonalInfoStepProps> = ({
  onNext,
  onBack,
  isLoading = false,
  userRole = 'tutor',
  progressData
}) => {
  const { profile, user, isLoading: profileLoading } = useUserProfile();
  const [formData, setFormData] = useState<PersonalInfoData>({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    email: '',
    phone: '',
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Save strategies
  const { saveOnNavigate, saveOnAutoSave, saveOnContinue } = useDifferentiatedSave<PersonalInfoData>();

  // Auto-save with 5-second debounce
  const { saveStatus, lastSaved, error } = useOnboardingAutoSave(
    formData,
    async (data) => {
      if (!user?.id) throw new Error('User not authenticated');

      await saveOnboardingProgress({
        userId: user.id,
        progress: {
          tutor: {
            personalInfo: {
              firstName: data.firstName,
              lastName: data.lastName,
              gender: data.gender,
              dateOfBirth: data.dateOfBirth,
              email: data.email,
              phone: data.phone,
            }
          }
        }
      });
    },
    {
      enabled: isInitialized && !profileLoading, // Only auto-save after initialization
    }
  );

  console.log('[TutorPersonalInfoStep] Component render', {
    hasProfile: !!profile,
    hasUser: !!user,
    profileLoading,
    isInitialized,
    formDataFirstName: formData.firstName,
    formDataLastName: formData.lastName,
    profileFirstName: profile?.first_name,
    profileLastName: profile?.last_name,
    saveStatus
  });

  // Pre-populate from profile AND restore saved onboarding progress
  useEffect(() => {
    console.log('[TutorPersonalInfoStep] useEffect triggered', {
      hasProfile: !!profile,
      hasUser: !!user,
      profileLoading,
      isInitialized,
      profileData: profile ? {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        full_name: profile.full_name,
        email: profile.email
      } : null
    });

    // Only initialize once when profile loads and we haven't initialized yet
    if (profile && !isInitialized && !profileLoading) {
      console.log('[TutorPersonalInfoStep] ✨ INITIALIZING form with profile data');

      // Load saved onboarding progress first
      getOnboardingProgress('tutor')
        .then(savedProgress => {
          const savedData = savedProgress?.progress?.tutor?.personalInfo;

          const newFormData = {
            // Priority: saved progress > profile data > empty
            firstName: savedData?.firstName || profile.first_name || '',
            lastName: savedData?.lastName || profile.last_name || '',
            gender: savedData?.gender || profile.gender || '',
            dateOfBirth: savedData?.dateOfBirth || profile.date_of_birth || '',
            email: savedData?.email || user?.email || profile.email || '',
            phone: savedData?.phone || profile.phone || '',
          };

          console.log('[TutorPersonalInfoStep] ✅ Restored data:', {
            hasSavedProgress: !!savedData,
            formData: newFormData
          });

          setFormData(newFormData);
          setIsInitialized(true);

          // Initialize date picker
          if (newFormData.dateOfBirth) {
            try {
              const parsedDate = parse(newFormData.dateOfBirth, 'yyyy-MM-dd', new Date());
              setSelectedDate(parsedDate);
            } catch (e) {
              console.error('[TutorPersonalInfoStep] Error parsing date of birth:', e);
            }
          }
        })
        .catch(error => {
          console.error('[TutorPersonalInfoStep] Error loading saved progress:', error);

          // Fallback to profile data only
          const newFormData = {
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            gender: profile.gender || '',
            dateOfBirth: profile.date_of_birth || '',
            email: user?.email || profile.email || '',
            phone: profile.phone || '',
          };

          setFormData(newFormData);
          setIsInitialized(true);
        });
    } else if (!profile && !profileLoading) {
      console.log('[TutorPersonalInfoStep] ⚠️  Profile loaded but is null/undefined');
    } else if (profileLoading) {
      console.log('[TutorPersonalInfoStep] ⏳ Profile is still loading...');
    }
  }, [profile, user, profileLoading, isInitialized]);

  // MVP Validation - Only required fields
  const isFormValid =
    formData.firstName.trim() !== '' &&
    formData.lastName.trim() !== '' &&
    formData.gender !== '' &&
    formData.dateOfBirth !== '' &&
    formData.email.trim() !== '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setFormData(prev => ({ ...prev, dateOfBirth: formattedDate }));
    } else {
      setFormData(prev => ({ ...prev, dateOfBirth: '' }));
    }
  };

  const handleContinue = async () => {
    console.log('[TutorPersonalInfoStep] handleContinue called');
    console.log('[TutorPersonalInfoStep] Form data:', formData);
    console.log('[TutorPersonalInfoStep] isFormValid:', isFormValid);

    if (!user?.id) {
      console.error('[TutorPersonalInfoStep] User not authenticated');
      return;
    }

    // Use blocking save strategy for manual continue
    const success = await saveOnContinue({
      data: formData,
      onSave: async (data) => {
        await saveOnboardingProgress({
          userId: user.id,
          progress: {
            tutor: {
              personalInfo: {
                firstName: data.firstName,
                lastName: data.lastName,
                gender: data.gender,
                dateOfBirth: data.dateOfBirth,
                email: data.email,
                phone: data.phone,
              }
            }
          }
        });
      },
    });

    if (success) {
      console.log('[TutorPersonalInfoStep] Save successful, calling onNext...');
      onNext(formData);
    } else {
      console.error('[TutorPersonalInfoStep] Save failed, not advancing');
    }
  };

  const handleBack = () => {
    if (!user?.id || !onBack) return;

    // Use optimistic save strategy for navigation
    saveOnNavigate({
      data: formData,
      onSave: async (data) => {
        await saveOnboardingProgress({
          userId: user.id,
          progress: {
            tutor: {
              personalInfo: {
                firstName: data.firstName,
                lastName: data.lastName,
                gender: data.gender,
                dateOfBirth: data.dateOfBirth,
                email: data.email,
                phone: data.phone,
              }
            }
          }
        });
      },
    });

    // Navigate immediately and pass data to wizard (optimistic)
    onBack(formData);
  };

  // Get role display name
  const roleDisplayNames = {
    tutor: 'Tutor',
    agent: 'Agent',
    client: 'Client'
  };
  const roleDisplayName = roleDisplayNames[userRole] || 'Tutor';

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <div>
          <h2 className={styles.stepTitle}>Personal Information</h2>
          <p className={styles.stepSubtitle}>
            {roleDisplayName} Onboarding • Let&apos;s start with your basic information
          </p>
        </div>
      </div>

      <div className={styles.stepBody}>
        <HubForm.Section>
          {/* Progress Badge - Top Right Corner of Form */}
          {progressData && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '24px',
                marginTop: '-8px',
              }}
            >
              <InlineProgressBadge
                currentPoints={progressData.currentPoints}
                totalPoints={progressData.totalPoints}
                currentStepPoints={progressData.currentStepPoints}
                requiredPoints={progressData.requiredPoints}
                steps={progressData.steps}
              />
            </div>
          )}

          {/* Auto-save Indicator */}

          <HubForm.Grid>
            <HubForm.Field label="First Name" required>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                disabled={isLoading}
                required
              />
            </HubForm.Field>

            <HubForm.Field label="Last Name" required>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Smith"
                disabled={isLoading}
                required
              />
            </HubForm.Field>

            <HubForm.Field label="Gender" required>
              <UnifiedSelect
                value={formData.gender}
                onChange={(value) => {
                  const event = {
                    target: {
                      name: 'gender',
                      value: String(value)
                    }
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleChange(event);
                }}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                  { value: 'Prefer not to say', label: 'Prefer not to say' }
                ]}
                placeholder="Select gender"
                disabled={isLoading}
              />
            </HubForm.Field>

            <HubForm.Field label="Date of Birth" required>
              <DatePicker
                selected={selectedDate}
                onSelect={handleDateChange}
              />
            </HubForm.Field>

            <HubForm.Field label="Email" required>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="johnsmith@gmail.com"
                disabled={isLoading}
                required
              />
            </HubForm.Field>

            <HubForm.Field label="Phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+44 07575 123456"
                disabled={isLoading}
              />
            </HubForm.Field>
          </HubForm.Grid>
        </HubForm.Section>
      </div>

      <WizardActionButtons
        onContinue={handleContinue}
        onBack={handleBack}
        backLabel="← Back"
        continueEnabled={isFormValid}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TutorPersonalInfoStep;
