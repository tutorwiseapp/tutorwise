'use client';

/**
 * Shared Personal Info Step Component
 *
 * A unified component for tutor, agent, and client personal info.
 * All roles share the same fields; only the role context differs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { format, parse } from 'date-fns';
import styles from '../OnboardingShared.module.css';
import { OnboardingActionButtons } from '../OnboardingButton';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import { HubForm } from '@/app/components/hub/form/HubForm';
import InlineProgressBadge from '../InlineProgressBadge';
import { getOnboardingProgress, saveOnboardingProgress } from '@/lib/api/onboarding';
import { useOnboardingAutoSave } from '@/hooks/useAutoSave';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { hasUnsavedChanges as checkUnsavedChanges } from '@/lib/offlineQueue';
import { useFormConfig } from '@/hooks/useFormConfig';
import { OnboardingRole } from '../configs';

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' }
];

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

interface PersonalInfoStepProps {
  role: OnboardingRole;
  onNext: (data: PersonalInfoData) => void;
  onBack?: () => void;
  isLoading?: boolean;
  progressData?: ProgressData;
}

const roleDisplayNames: Record<OnboardingRole, string> = {
  tutor: 'Tutor',
  agent: 'Agent',
  client: 'Client'
};

const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  role,
  onNext,
  onBack,
  isLoading = false,
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

  // Fetch dynamic form config for gender field
  const { config: genderConfig } = useFormConfig({
    fieldName: 'gender',
    context: `onboarding.${role}`,
    fallback: {
      label: 'Gender',
      placeholder: 'Select gender',
      options: genderOptions
    }
  });

  // Offline sync - auto-sync when connection restored
  useOfflineSync(user?.id);

  // Auto-save with 3-second debounce
  const { saveStatus } = useOnboardingAutoSave(
    formData,
    async (data) => {
      if (!user?.id) throw new Error('User not authenticated');

      await saveOnboardingProgress({
        userId: user.id,
        progress: {
          [role]: {
            personalInfo: data
          }
        }
      });
    },
    {
      enabled: isInitialized && !profileLoading,
    }
  );

  // Pre-populate from profile AND restore saved onboarding progress
  useEffect(() => {
    if (profile && !isInitialized && !profileLoading) {
      console.log(`[PersonalInfoStep:${role}] Initializing form with profile data`);

      getOnboardingProgress(role)
        .then(savedProgress => {
          const savedData = savedProgress?.progress?.[role]?.personalInfo;

          const newFormData = {
            firstName: savedData?.firstName || profile.first_name || '',
            lastName: savedData?.lastName || profile.last_name || '',
            gender: savedData?.gender || profile.gender || '',
            dateOfBirth: savedData?.dateOfBirth || profile.date_of_birth || '',
            email: savedData?.email || user?.email || profile.email || '',
            phone: savedData?.phone || profile.phone || '',
          };

          console.log(`[PersonalInfoStep:${role}] ✅ Restored data:`, {
            hasSavedProgress: !!savedData,
            formData: newFormData
          });

          setFormData(newFormData);
          setIsInitialized(true);

          if (newFormData.dateOfBirth) {
            try {
              const parsedDate = parse(newFormData.dateOfBirth, 'yyyy-MM-dd', new Date());
              setSelectedDate(parsedDate);
            } catch (e) {
              console.error(`[PersonalInfoStep:${role}] Error parsing date of birth:`, e);
            }
          }
        })
        .catch(error => {
          console.error(`[PersonalInfoStep:${role}] Error loading saved progress:`, error);

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
    }
  }, [profile, user, profileLoading, isInitialized, role]);

  // beforeunload warning
  useEffect(() => {
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

  // Validation
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

  // onBlur save handler
  const handleBlur = useCallback((fieldName: string) => {
    if (!fieldName || isSaving || !user?.id) return;

    setTimeout(() => {
      if (editingField !== fieldName) return;

      setIsSaving(true);
      saveOnboardingProgress({
        userId: user.id,
        progress: {
          [role]: {
            personalInfo: formData
          }
        }
      })
        .then(() => console.log(`[PersonalInfoStep:${role}] ✓ Blur save completed`))
        .catch((error) => console.error(`[PersonalInfoStep:${role}] ❌ Blur save failed:`, error))
        .finally(() => {
          setIsSaving(false);
          setEditingField(null);
        });
    }, 150);
  }, [editingField, isSaving, user?.id, formData, role]);

  // Immediate save for select changes
  const handleSelectChange = useCallback((field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    if (!user?.id) return;

    saveOnboardingProgress({
      userId: user.id,
      progress: {
        [role]: {
          personalInfo: newData
        }
      }
    }).catch((error) => console.error(`[PersonalInfoStep:${role}] ❌ Select save failed:`, error));
  }, [formData, user?.id, role]);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);

    const newFormData = date
      ? { ...formData, dateOfBirth: format(date, 'yyyy-MM-dd') }
      : { ...formData, dateOfBirth: '' };

    setFormData(newFormData);

    if (user?.id) {
      saveOnboardingProgress({
        userId: user.id,
        progress: {
          [role]: {
            personalInfo: newFormData
          }
        }
      }).catch((error) => console.error(`[PersonalInfoStep:${role}] ❌ Date save failed:`, error));
    }
  };

  const handleNext = () => {
    console.log(`[PersonalInfoStep:${role}] handleNext called`);
    onNext(formData);
  };

  const roleDisplayName = roleDisplayNames[role];

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

            <HubForm.Field label={genderConfig.label || 'Gender'} required>
              <UnifiedSelect
                value={formData.gender}
                onChange={(value) => handleSelectChange('gender', String(value))}
                options={genderConfig.options || genderOptions}
                placeholder={genderConfig.placeholder || 'Select gender'}
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

      <OnboardingActionButtons
        onNext={handleNext}
        onBack={onBack}
        backLabel="← Back"
        nextEnabled={isFormValid}
        isLoading={isLoading}
      />
    </div>
  );
};

export default PersonalInfoStep;
