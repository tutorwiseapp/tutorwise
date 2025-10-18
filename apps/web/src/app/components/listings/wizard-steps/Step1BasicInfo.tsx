'use client';

import { useState, useEffect } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface Step1Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

export default function Step1BasicInfo({ formData, onNext, onBack }: Step1Props) {
  const [tutorName, setTutorName] = useState(formData.tutor_name || '');
  const [title, setTitle] = useState(formData.title || '');
  const [description, setDescription] = useState(formData.description || '');
  const [errors, setErrors] = useState<{ tutorName?: string; title?: string; description?: string }>({});
  const [isWaitingForProfile, setIsWaitingForProfile] = useState(!formData.tutor_name);

  // Sync local state with formData prop changes (for auto-population)
  useEffect(() => {
    console.log('[Step1BasicInfo] Sync check:', {
      formDataTutorName: formData.tutor_name,
      localTutorName: tutorName,
      formDataTitle: formData.title,
      localTitle: title,
      isWaitingForProfile
    });

    // Always sync from formData to local state when formData changes
    if (formData.tutor_name !== tutorName) {
      console.log('[Step1BasicInfo] Syncing tutor name from formData:', formData.tutor_name);
      setTutorName(formData.tutor_name || '');
      if (formData.tutor_name) {
        setIsWaitingForProfile(false);
      }
    }
    if (formData.title !== title) {
      setTitle(formData.title || '');
    }
    if (formData.description !== description) {
      setDescription(formData.description || '');
    }
  }, [formData.tutor_name, formData.title, formData.description, tutorName, title, description]);

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
            value={formData.tutor_name || tutorName || 'Loading...'}
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
              Debug: formData.tutor_name = {JSON.stringify(formData.tutor_name)} | tutorName = {JSON.stringify(tutorName)}
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
