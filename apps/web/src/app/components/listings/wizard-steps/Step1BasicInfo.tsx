'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface Step1Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

export default function Step1BasicInfo({ formData, onNext, onBack }: Step1Props) {
  const [title, setTitle] = useState(formData.title || '');
  const [description, setDescription] = useState(formData.description || '');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  const validate = () => {
    const newErrors: { title?: string; description?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
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
      onNext({ title: title.trim(), description: description.trim() });
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
        {/* Title */}
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
          <button onClick={onBack} className={styles.buttonSecondary}>
            ← Back
          </button>
        </div>
        <div className={styles.actionRight}>
          <button onClick={handleContinue} className={styles.buttonPrimary}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
