// apps/web/src/app/components/feature/onboarding/tutor/TutorPersonalInfoStep.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { format, parse } from 'date-fns';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { PersonalInfoData } from './TutorOnboardingWizard';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import { HubForm } from '@/app/components/hub/form/HubForm';

interface TutorPersonalInfoStepProps {
  onNext: (data: PersonalInfoData) => void;
  onBack?: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  userRole?: 'tutor' | 'agent' | 'client';
}

const TutorPersonalInfoStep: React.FC<TutorPersonalInfoStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading = false,
  userRole = 'tutor'
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

  // Pre-populate from profile if available
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
      console.log('[TutorPersonalInfoStep] ✨ INITIALIZING form with profile data:', {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email
      });

      const newFormData = {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        gender: profile.gender || '',
        dateOfBirth: profile.date_of_birth || '',
        email: user?.email || profile.email || '',
        phone: profile.phone || '',
      };

      console.log('[TutorPersonalInfoStep] ✅ Setting formData to:', newFormData);

      setFormData(newFormData);
      setIsInitialized(true);

      // Initialize date picker if date of birth exists
      if (profile.date_of_birth) {
        try {
          const parsedDate = parse(profile.date_of_birth, 'yyyy-MM-dd', new Date());
          setSelectedDate(parsedDate);
        } catch (e) {
          console.error('[TutorPersonalInfoStep] Error parsing date of birth:', e);
        }
      }
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

  const handleContinue = () => {
    console.log('[TutorPersonalInfoStep] handleContinue called');
    console.log('[TutorPersonalInfoStep] Form data:', formData);
    console.log('[TutorPersonalInfoStep] isFormValid:', isFormValid);
    console.log('[TutorPersonalInfoStep] Calling onNext...');

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
        <h2 className={styles.stepTitle}>Personal Information</h2>
        <p className={styles.stepSubtitle}>
          {roleDisplayName} Onboarding • Let&apos;s start with your basic information
        </p>
      </div>

      <div className={styles.stepBody}>
        <HubForm.Section>
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
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={isLoading}
                required
                style={{
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '12px',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
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
        onBack={onBack}
        backLabel="← Back to Role Selection"
        continueEnabled={isFormValid}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TutorPersonalInfoStep;
