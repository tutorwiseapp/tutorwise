// apps/web/src/app/components/feature/onboarding/tutor/TutorPersonalInfoStep.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { format, parse } from 'date-fns';
import styles from '../../OnboardingWizard.module.css';
import { WizardActionButtons } from '../../shared/WizardButton';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import { HubForm } from '@/app/components/hub/form/HubForm';
import InlineProgressBadge from '../../shared/InlineProgressBadge';
import { getOnboardingProgress, saveOnboardingProgress } from '@/lib/api/onboarding';
import { useOnboardingAutoSave } from '@/hooks/useAutoSave';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { hasUnsavedChanges as checkUnsavedChanges} from '@/lib/offlineQueue';

export interface PersonalInfoData {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  completed?: boolean;
}

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
  onBack?: () => void;
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
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Offline sync - auto-sync when connection restored
  useOfflineSync(user?.id);

  // Auto-save with 3-second debounce (runs in background, doesn't block Next button)
  const { saveStatus } = useOnboardingAutoSave(
    formData,
    async (data) => {
      if (!user?.id) throw new Error('User not authenticated');

      await saveOnboardingProgress({
        userId: user.id,
        progress: {
          tutor: {
            personalInfo: data
          }
        }
      });
    },
    {
      enabled: isInitialized && !profileLoading,
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
    profileLastName: profile?.last_name
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

  // beforeunload warning - prevent accidental close with unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      const hasUnsaved = await checkUnsavedChanges();
      if (saveStatus === 'saving' || isSaving || hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus, isSaving]);

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

  // onBlur save handler (150ms delay - matches ProfessionalInfoForm pattern)
  const handleBlur = React.useCallback((fieldName: string) => {
    if (!fieldName || isSaving || !user?.id) return;

    setTimeout(() => {
      if (editingField !== fieldName) return;

      console.log(`[TutorPersonalInfoStep] onBlur save for: ${fieldName}`);
      setIsSaving(true);

      saveOnboardingProgress({
        userId: user.id,
        progress: {
          tutor: {
            personalInfo: formData
          }
        }
      })
        .then(() => console.log('[TutorPersonalInfoStep] ✓ Blur save completed'))
        .catch((error) => console.error('[TutorPersonalInfoStep] ❌ Blur save failed:', error))
        .finally(() => {
          setIsSaving(false);
          setEditingField(null);
        });
    }, 150);
  }, [editingField, isSaving, user?.id, formData]);

  // Immediate save for select changes
  const handleSelectChange = React.useCallback((field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    if (!user?.id) return;

    console.log(`[TutorPersonalInfoStep] Immediate save for select: ${field}`);
    saveOnboardingProgress({
      userId: user.id,
      progress: {
        tutor: {
          personalInfo: newData
        }
      }
    })
      .then(() => console.log('[TutorPersonalInfoStep] ✓ Select save completed'))
      .catch((error) => console.error('[TutorPersonalInfoStep] ❌ Select save failed:', error));
  }, [formData, user?.id]);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);

    const newFormData = date
      ? { ...formData, dateOfBirth: format(date, 'yyyy-MM-dd') }
      : { ...formData, dateOfBirth: '' };

    setFormData(newFormData);

    // Immediate save for date picker
    if (user?.id) {
      console.log('[TutorPersonalInfoStep] Immediate save for date picker');
      saveOnboardingProgress({
        userId: user.id,
        progress: {
          tutor: {
            personalInfo: newFormData
          }
        }
      })
        .then(() => console.log('[TutorPersonalInfoStep] ✓ Date save completed'))
        .catch((error) => console.error('[TutorPersonalInfoStep] ❌ Date save failed:', error));
    }
  };

  const handleNext = () => {
    console.log('[TutorPersonalInfoStep] handleNext called');
    console.log('[TutorPersonalInfoStep] Form data:', formData);
    console.log('[TutorPersonalInfoStep] isFormValid:', isFormValid);
    console.log('[TutorPersonalInfoStep] Calling onNext...');

    // Page handles all database operations
    onNext(formData);

    console.log('[TutorPersonalInfoStep] onNext called successfully');
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
                onFocus={() => setEditingField('firstName')}
                onBlur={() => handleBlur('firstName')}
                placeholder="John"
                disabled={isLoading || isSaving}
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
                onFocus={() => setEditingField('lastName')}
                onBlur={() => handleBlur('lastName')}
                placeholder="Smith"
                disabled={isLoading || isSaving}
                required
              />
            </HubForm.Field>

            <HubForm.Field label="Gender" required>
              <UnifiedSelect
                value={formData.gender}
                onChange={(value) => handleSelectChange('gender', String(value))}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                  { value: 'Prefer not to say', label: 'Prefer not to say' }
                ]}
                placeholder="Select gender"
                disabled={isLoading || isSaving}
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
                onFocus={() => setEditingField('email')}
                onBlur={() => handleBlur('email')}
                placeholder="johnsmith@gmail.com"
                disabled={isLoading || isSaving}
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
                onFocus={() => setEditingField('phone')}
                onBlur={() => handleBlur('phone')}
                placeholder="+44 07575 123456"
                disabled={isLoading || isSaving}
              />
            </HubForm.Field>
          </HubForm.Grid>
        </HubForm.Section>
      </div>

      <WizardActionButtons
        onNext={handleNext}
        onBack={onBack}
        backLabel="← Back"
        nextEnabled={isFormValid}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TutorPersonalInfoStep;
