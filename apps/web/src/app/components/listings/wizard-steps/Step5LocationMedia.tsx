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
  const [status, setStatus] = useState<'draft' | 'published'>(
    formData.status === 'published' ? 'published' : 'draft'
  );
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
          <p className={styles.helperText}>
            How will you deliver your tutoring sessions?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className={`${styles.checkboxItem} ${locationType === 'online' ? styles.selected : ''}`}
              onClick={() => setLocationType('online')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', textAlign: 'left' }}
            >
              <span style={{ fontWeight: 600, marginBottom: '0.25rem' }}>💻 Online Only</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Teach via video call (Zoom, Teams, Google Meet, etc.)
              </span>
            </button>

            <button
              type="button"
              className={`${styles.checkboxItem} ${locationType === 'in_person' ? styles.selected : ''}`}
              onClick={() => setLocationType('in_person')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', textAlign: 'left' }}
            >
              <span style={{ fontWeight: 600, marginBottom: '0.25rem' }}>📍 In-Person Only</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Face-to-face tutoring at your location or student&apos;s home
              </span>
            </button>

            <button
              type="button"
              className={`${styles.checkboxItem} ${locationType === 'hybrid' ? styles.selected : ''}`}
              onClick={() => setLocationType('hybrid')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', textAlign: 'left' }}
            >
              <span style={{ fontWeight: 600, marginBottom: '0.25rem' }}>🌐 Hybrid (Both)</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Flexible - offer both online and in-person options
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
            <p className={styles.helperText}>
              We&apos;ll only show your general area to students (not your exact address)
            </p>
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
          <p className={styles.helperText}>
            Add a YouTube or Vimeo link to introduce yourself (increases trust!)
          </p>
        </div>

        {/* Publish or Draft */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--color-background-secondary, #f9fafb)',
          borderRadius: '0.5rem',
          marginTop: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            Ready to publish?
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            <button
              type="button"
              className={`${styles.checkboxItem} ${status === 'draft' ? styles.selected : ''}`}
              onClick={() => setStatus('draft')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', textAlign: 'left' }}
            >
              <span style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Save as Draft</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                You can preview and edit before publishing
              </span>
            </button>

            <button
              type="button"
              className={`${styles.checkboxItem} ${status === 'published' ? styles.selected : ''}`}
              onClick={() => setStatus('published')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', textAlign: 'left' }}
            >
              <span style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Publish Now</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Make your listing visible to students immediately
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          <button onClick={onBack} className={styles.buttonSecondary} disabled={isSaving}>
            ← Back
          </button>
          <button onClick={onSaveDraft} className={styles.buttonSecondary} disabled={isSaving}>
            Save for Later
          </button>
        </div>

        <div className={styles.actionRight}>
          <button
            onClick={() => handleSubmit(status === 'published')}
            disabled={isSaving}
            className={styles.buttonPrimary}
          >
            {isSaving ? 'Saving...' : status === 'published' ? 'Publish Listing ✓' : 'Save as Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
