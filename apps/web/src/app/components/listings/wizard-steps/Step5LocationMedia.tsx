'use client';

import { useState } from 'react';
import type { CreateListingInput, LocationType } from '@tutorwise/shared-types';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface Step5Props {
  formData: Partial<CreateListingInput>;
  onBack: () => void;
  onSubmit: (data: Partial<CreateListingInput>) => void;
  onSaveDraft: () => void;
  isSaving: boolean;
}

export default function Step5LocationMedia({
  formData,
  onBack,
  onSubmit,
  onSaveDraft,
  isSaving,
}: Step5Props) {
  const [locationType, setLocationType] = useState<LocationType>(formData.location_type || 'online');
  const [locationCity, setLocationCity] = useState(formData.location_city || '');
  const [locationPostcode, setLocationPostcode] = useState(formData.location_postcode || '');
  const [videoUrl, setVideoUrl] = useState(formData.video_url || '');
  const [errors, setErrors] = useState<{ locationType?: string; location?: string }>({});

  const validate = () => {
    const newErrors: { locationType?: string; location?: string } = {};

    if (!locationType) {
      newErrors.locationType = 'Please select at least one delivery method';
    }

    if ((locationType === 'in_person' || locationType === 'hybrid') && !locationCity.trim()) {
      newErrors.location = 'Please enter your location for in-person tutoring';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (publishNow: boolean) => {
    if (validate()) {
      onSubmit({
        location_type: locationType,
        location_city: locationCity.trim() || undefined,
        location_postcode: locationPostcode.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        status: publishNow ? 'published' : 'draft',
      });
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>Location & Media</h1>
        <p className={styles.stepSubtitle}>
          Final step! Let students know where you teach and add an optional introduction video.
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Location Type */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Delivery Mode <span style={{ color: 'var(--color-error, #dc2626)' }}>*</span>
          </label>
          {errors.locationType && (
            <p className={styles.errorText}>{errors.locationType}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <button
              type="button"
              className={`${styles.checkboxItem} ${locationType === 'online' ? styles.selected : ''}`}
              onClick={() => setLocationType('online')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', textAlign: 'left', minHeight: '80px' }}
            >
              <span style={{ fontWeight: 600, marginBottom: '4px' }}>Online Only</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8, lineHeight: '1.4' }}>
                Video call tutoring
              </span>
            </button>

            <button
              type="button"
              className={`${styles.checkboxItem} ${locationType === 'in_person' ? styles.selected : ''}`}
              onClick={() => setLocationType('in_person')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', textAlign: 'left', minHeight: '80px' }}
            >
              <span style={{ fontWeight: 600, marginBottom: '4px' }}>In-Person Only</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8, lineHeight: '1.4' }}>
                Face-to-face tutoring
              </span>
            </button>

            <button
              type="button"
              className={`${styles.checkboxItem} ${locationType === 'hybrid' ? styles.selected : ''}`}
              onClick={() => setLocationType('hybrid')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', textAlign: 'left', minHeight: '80px', gridColumn: 'span 2' }}
            >
              <span style={{ fontWeight: 600, marginBottom: '4px' }}>Hybrid (Both)</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8, lineHeight: '1.4' }}>
                Flexible - both online and in-person
              </span>
            </button>
          </div>
        </div>

        {/* Location Details (if in-person or hybrid) */}
        {(locationType === 'in_person' || locationType === 'hybrid') && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Your Location <span style={{ color: 'var(--color-error, #dc2626)' }}>*</span>
            </label>
            {errors.location && (
              <p className={styles.errorText}>{errors.location}</p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="City or Town"
                className={styles.formInput}
              />
              <input
                type="text"
                value={locationPostcode}
                onChange={(e) => setLocationPostcode(e.target.value)}
                placeholder="Postcode (optional)"
                className={styles.formInput}
              />
            </div>
          </div>
        )}

        {/* Introduction Video (Optional) */}
        <div className={styles.formGroup}>
          <label htmlFor="video-url" className={styles.formLabel}>
            Introduction Video (Optional)
          </label>
          <input
            id="video-url"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className={styles.formInput}
          />
        </div>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          <button onClick={onBack} className={styles.buttonSecondary} disabled={isSaving}>
            Back
          </button>
          <button onClick={onSaveDraft} className={styles.buttonSecondary} disabled={isSaving}>
            Save for Later
          </button>
        </div>

        <div className={styles.actionRight}>
          <button
            onClick={() => handleSubmit(true)}
            disabled={isSaving}
            className={styles.buttonPrimary}
          >
            {isSaving ? 'Publishing...' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
