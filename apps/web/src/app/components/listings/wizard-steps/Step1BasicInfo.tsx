'use client';

import { useState, useEffect } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface Step1Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

export default function Step1BasicInfo({ formData, onNext, onBack }: Step1Props) {
  const { profile, isLoading: isProfileLoading } = useUserProfile();

  // Initialize tutorName state - start potentially empty
  const [tutorName, setTutorName] = useState(formData.tutor_name || '');
  const [title, setTitle] = useState(formData.title || '');
  const [description, setDescription] = useState(formData.description || '');
  const [errors, setErrors] = useState<{ tutorName?: string; title?: string; description?: string }>({});
  // Keep track if we initially relied on profile
  const [isWaitingForProfile, setIsWaitingForProfile] = useState(!formData.tutor_name);

  useEffect(() => {
    // Priority 1: If formData prop changes *after* initial render (e.g., loading a draft), update local state
    if (formData.tutor_name && formData.tutor_name !== tutorName) {
      console.log('[Step1BasicInfo] Syncing tutor name from formData prop change:', formData.tutor_name);
      setTutorName(formData.tutor_name);
      setIsWaitingForProfile(false); // No longer waiting if formData provided it
    }
    // Priority 2: If profile has loaded AND local state is still empty AND formData didn't provide it initially
    else if (!isProfileLoading && profile?.full_name && !tutorName && isWaitingForProfile) {
      console.log('[Step1BasicInfo] Initializing tutor name from loaded profile context:', profile.full_name);
      setTutorName(profile.full_name);
      setIsWaitingForProfile(false); // Name has been set
    }
    // Optional: If profile loads but has no full_name, stop waiting
    else if (!isProfileLoading && !profile?.full_name && isWaitingForProfile) {
      console.log('[Step1BasicInfo] Profile loaded but no full_name found.');
      setIsWaitingForProfile(false);
    }
  }, [
    profile,
    isProfileLoading,
    formData.tutor_name, // React to changes in the prop
    tutorName,            // Include local state to prevent unnecessary sets
    isWaitingForProfile   // Include waiting state
  ]);

  // Sync other fields with formData prop changes
  useEffect(() => {
    if (formData.title !== undefined && formData.title !== title) {
      setTitle(formData.title);
    }
  }, [formData.title]);

  useEffect(() => {
    if (formData.description !== undefined && formData.description !== description) {
      setDescription(formData.description);
    }
  }, [formData.description]);

  const validate = () => {
    const newErrors: { tutorName?: string; title?: string; description?: string } = {};

    if (!tutorName.trim()) {
      newErrors.tutorName = 'Tutor name is required';
    }

    if (!title.trim()) {
      newErrors.title = 'Service title is required';
    } else if (title.trim().length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title must be no more than 200 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext({
        tutor_name: tutorName.trim(),
        title: title.trim(),
        description: description.trim()
      });
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>Basic Information</h1>
        <p className={styles.stepSubtitle}>
          Create a clear title and description for your tutoring service
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Tutor Name - Read-only, populated from profile */}
        <div className={styles.formGroup}>
          <label htmlFor="tutorName" className={styles.formLabel}>
            Full Name <span style={{ color: 'var(--color-error, #dc2626)' }}>*</span>
          </label>
          <input
            id="tutorName"
            type="text"
            value={tutorName || (isProfileLoading ? 'Loading...' : '')}
            readOnly
            disabled
            className={styles.formInput}
            style={{
              backgroundColor: '#f3f4f6',
              cursor: 'not-allowed',
              color: '#374151',
              fontWeight: '500'
            }}
          />
          {errors.tutorName && (
            <p className={styles.errorText} style={{ margin: '8px 0 0 0' }}>
              {errors.tutorName}
            </p>
          )}
          <p className={styles.helperText} style={{ margin: '8px 0 0 0', fontSize: '0.75rem' }}>
            Your full legal name from your profile. To change it, update your profile settings.
          </p>
          {/* Debug info - remove after testing */}
          {process.env.NODE_ENV === 'development' && (
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
              Debug: isProfileLoading = {JSON.stringify(isProfileLoading)} | profile.full_name = {JSON.stringify(profile?.full_name)} | tutorName = {JSON.stringify(tutorName)}
            </p>
          )}
        </div>

        {/* Service Title */}
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.formLabel}>
            Service Title <span style={{ color: 'var(--color-error, #dc2626)' }}>*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., GCSE Mathematics Tutor - Experienced & Results-Focused"
            className={styles.formInput}
            maxLength={200}
            style={errors.title ? { borderColor: 'var(--color-error, #dc2626)' } : {}}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            {errors.title ? (
              <p className={styles.errorText} style={{ margin: 0 }}>
                {errors.title}
              </p>
            ) : (
              <p className={styles.helperText} style={{ margin: 0, fontSize: '0.75rem' }}>
                Min. 10 characters recommended
              </p>
            )}
            <span style={{ color: 'var(--color-text-tertiary, #9ca3af)', fontSize: '0.875rem' }}>
              {title.length}/200
            </span>
          </div>
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.formLabel}>
            Description <span style={{ color: 'var(--color-error, #dc2626)' }}>*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your teaching approach, experience, and what makes your tutoring effective..."
            rows={8}
            className={styles.formTextarea}
            maxLength={2000}
            style={errors.description ? { borderColor: 'var(--color-error, #dc2626)' } : {}}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            {errors.description ? (
              <p className={styles.errorText} style={{ margin: 0 }}>
                {errors.description}
              </p>
            ) : (
              <p className={styles.helperText} style={{ margin: 0, fontSize: '0.75rem' }}>
                Min. 50 characters recommended
              </p>
            )}
            <span style={{ color: 'var(--color-text-tertiary, #9ca3af)', fontSize: '0.875rem' }}>
              {description.length}/2000
            </span>
          </div>
        </div>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          <button type="button" onClick={onBack} className={styles.buttonSecondary}>
            Back
          </button>
        </div>
        <div className={styles.actionRight}>
          <button type="button" onClick={handleContinue} className={styles.buttonPrimary}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
