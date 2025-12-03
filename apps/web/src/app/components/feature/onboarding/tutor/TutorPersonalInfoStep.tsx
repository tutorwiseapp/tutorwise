// apps/web/src/app/components/feature/onboarding/tutor/TutorPersonalInfoStep.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { format, parse } from 'date-fns';
import styles from '../OnboardingWizard.module.css';
import formStyles from '../PersonalInfoForm.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { PersonalInfoData } from './TutorOnboardingWizard';
import DatePicker from '@/app/components/ui/forms/DatePicker';

interface TutorPersonalInfoStepProps {
  onNext: (data: PersonalInfoData) => void;
  onSkip?: () => void;
  isLoading?: boolean;
  userRole?: 'tutor' | 'agent' | 'client';
}

const TutorPersonalInfoStep: React.FC<TutorPersonalInfoStepProps> = ({
  onNext,
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
    address: '',
    town: '',
    city: '',
    country: '',
    postalCode: '',
    emergencyContactName: '',
    emergencyContactEmail: '',
    dbsCertificateNumber: '',
    dbsCertificateDate: '',
  });
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDbsDate, setSelectedDbsDate] = useState<Date | undefined>(undefined);

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

  // Check if DBS fields should be shown (for tutors/providers and agents only)
  const showDbsFields = userRole === 'tutor' || userRole === 'agent';

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
        address: profile.address_line1 || '',
        town: profile.town || '',
        city: profile.city || '',
        country: profile.country || '',
        postalCode: profile.postal_code || '',
        identityVerificationDocumentUrl: profile.identity_verification_document_url || '',
        identityVerificationDocumentName: profile.identity_verification_document_name || '',
        emergencyContactName: profile.emergency_contact_name || '',
        emergencyContactEmail: profile.emergency_contact_email || '',
        dbsCertificateNumber: profile.dbs_certificate_number || '',
        dbsCertificateDate: profile.dbs_certificate_date || '',
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

      // Initialize DBS date picker if DBS certificate date exists
      if (profile.dbs_certificate_date) {
        try {
          const parsedDbsDate = parse(profile.dbs_certificate_date, 'yyyy-MM-dd', new Date());
          setSelectedDbsDate(parsedDbsDate);
        } catch (e) {
          console.error('[TutorPersonalInfoStep] Error parsing DBS date:', e);
        }
      }

      if (profile.identity_verification_document_name) {
        setUploadedFileName(profile.identity_verification_document_name);
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

  const handleDbsDateChange = (date: Date | undefined) => {
    setSelectedDbsDate(date);
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setFormData(prev => ({ ...prev, dbsCertificateDate: formattedDate }));
    } else {
      setFormData(prev => ({ ...prev, dbsCertificateDate: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images and PDFs only)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setFileError('Please upload a valid image (JPG, PNG) or PDF file');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setFileError('File size must be less than 5MB');
        return;
      }

      setFormData(prev => ({ ...prev, identityVerificationDocumentFile: file }));
      setUploadedFileName(file.name);
      setFileError('');
    }
  };

  const handleDeleteDocument = () => {
    setFormData(prev => ({
      ...prev,
      identityVerificationDocumentFile: undefined,
      identityVerificationDocumentUrl: '',
      identityVerificationDocumentName: ''
    }));
    setUploadedFileName('');
    const fileInput = document.getElementById('identityDocument') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleContinue = () => {
    console.log('[TutorPersonalInfoStep] handleContinue called');
    console.log('[TutorPersonalInfoStep] Form data:', formData);
    console.log('[TutorPersonalInfoStep] isFormValid:', isFormValid);
    console.log('[TutorPersonalInfoStep] Calling onNext...');

    onNext(formData);

    console.log('[TutorPersonalInfoStep] onNext called successfully');
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Personal Information</h2>
        <p className={styles.stepSubtitle}>
          Let&apos;s start with your basic information
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Name and Gender - 2 Column Layout */}
        <div className={formStyles.twoColumnGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="firstName">
              First Name *
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="John"
              disabled={isLoading}
              required
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="lastName">
              Last Name *
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Smith"
              disabled={isLoading}
              required
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="gender">
              Gender *
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={isLoading}
              required
              className={styles.formInput}
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
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="dateOfBirth">
              Date of Birth *
            </label>
            <DatePicker
              selected={selectedDate}
              onSelect={handleDateChange}
            />
          </div>
        </div>

        {/* Email and Phone - 2 Column Layout */}
        <div className={formStyles.twoColumnGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="email">
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="johnsmith@gmail.com"
              disabled={isLoading}
              required
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+44 07575 123456"
              disabled={isLoading}
              className={styles.formInput}
            />
          </div>
        </div>

        {/* Optional Fields Section */}
        <div className={formStyles.sectionDivider}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--color-text-primary, #1f2937)' }}>
            Additional Information (Optional)
          </h3>
          <p className={styles.helperText} style={{ marginBottom: '1.5rem' }}>
            You can complete these fields now or add them later in your profile settings
          </p>

          {/* Address Fields - 2 Column Layout */}
          <div className={formStyles.twoColumnGrid}>
            <div className={`${styles.formGroup} ${formStyles.fullWidth}`}>
              <label className={styles.formLabel} htmlFor="address">
                Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                placeholder="100, The Royal Observatory"
                disabled={isLoading}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="town">
                Town
              </label>
              <input
                id="town"
                name="town"
                type="text"
                value={formData.town}
                onChange={handleChange}
                placeholder="Greenwich"
                disabled={isLoading}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="city">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                placeholder="London"
                disabled={isLoading}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="country">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                placeholder="United Kingdom"
                disabled={isLoading}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="postalCode">
                Postcode/Zip Code
              </label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="SE10 8XJ"
                disabled={isLoading}
                className={styles.formInput}
              />
            </div>
          </div>

          {/* Identity Verification Document Upload */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="identityDocument">
              Upload Identity Verification Document
            </label>
            <div className={formStyles.fileUploadContainer}>
              <input
                id="identityDocument"
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="identityDocument"
                className={styles.buttonSecondary}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  margin: 0,
                  display: 'inline-block'
                }}
              >
                {uploadedFileName || 'Choose File'}
              </label>
              {uploadedFileName && (
                <button
                  type="button"
                  onClick={handleDeleteDocument}
                  disabled={isLoading}
                  className={styles.buttonSecondary}
                  style={{
                    borderColor: '#ef4444',
                    color: '#ef4444'
                  }}
                >
                  Delete Document
                </button>
              )}
            </div>
            {uploadedFileName && (
              <p className={styles.helperText} style={{ color: 'var(--color-primary, #006C67)', marginTop: '0.5rem' }}>
                ✓ {uploadedFileName}
              </p>
            )}
            {fileError && (
              <p className={styles.errorText}>
                {fileError}
              </p>
            )}
            <p className={styles.helperText} style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Passport, driver&apos;s license, or national ID (JPG, PNG, PDF - max 5MB)
            </p>
          </div>

          {/* Emergency Contact - 2 Column Layout */}
          <div className={formStyles.subsection}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--color-text-primary, #1f2937)' }}>
              Emergency Contact
            </h4>
            <div className={formStyles.twoColumnGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="emergencyContactName">
                  Emergency Contact Name
                </label>
                <input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  disabled={isLoading}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="emergencyContactEmail">
                  Emergency Contact Email
                </label>
                <input
                  id="emergencyContactEmail"
                  name="emergencyContactEmail"
                  type="email"
                  value={formData.emergencyContactEmail}
                  onChange={handleChange}
                  placeholder="emergency@example.com"
                  disabled={isLoading}
                  className={styles.formInput}
                />
              </div>
            </div>
          </div>

          {/* DBS Certificate Information - 2 Column Layout (Only for Tutors and Agents) */}
          {showDbsFields && (
            <div className={formStyles.subsection}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--color-text-primary, #1f2937)' }}>
                DBS Certificate Information
              </h4>
              <p className={styles.helperText} style={{ marginBottom: '1rem' }}>
                Required for tutors working with children and vulnerable adults in the UK
              </p>
              <div className={formStyles.twoColumnGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="dbsCertificateNumber">
                    DBS Certificate Number
                  </label>
                  <input
                    id="dbsCertificateNumber"
                    name="dbsCertificateNumber"
                    type="text"
                    value={formData.dbsCertificateNumber || ''}
                    onChange={handleChange}
                    placeholder="001234567890"
                    disabled={isLoading}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="dbsCertificateDate">
                    DBS Certificate Issue Date
                  </label>
                  <DatePicker
                    selected={selectedDbsDate}
                    onSelect={handleDbsDateChange}
                    placeholder="Select issue date"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={isFormValid}
        onSkip={onSkip}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TutorPersonalInfoStep;
