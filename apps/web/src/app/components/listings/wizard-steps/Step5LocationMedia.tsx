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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <label
              className={`${styles.checkboxItem} ${locationType === 'online' ? styles.selected : ''}`}
              style={{ padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}
            >
              <input
                type="radio"
                name="location"
                checked={locationType === 'online'}
                onChange={() => setLocationType('online')}
                className={styles.checkboxInput}
                style={{ marginTop: '0.125rem' }}
              />
              <div style={{ marginLeft: '0.75rem' }}>
                <span className={styles.checkboxLabel}>💻 Online Only</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', marginTop: '0.25rem' }}>
                  Teach via video call (Zoom, Teams, Google Meet, etc.)
                </p>
              </div>
            </label>

            <label
              className={`${styles.checkboxItem} ${locationType === 'in_person' ? styles.selected : ''}`}
              style={{ padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}
            >
              <input
                type="radio"
                name="location"
                checked={locationType === 'in_person'}
                onChange={() => setLocationType('in_person')}
                className={styles.checkboxInput}
                style={{ marginTop: '0.125rem' }}
              />
              <div style={{ marginLeft: '0.75rem' }}>
                <span className={styles.checkboxLabel}>📍 In-Person Only</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', marginTop: '0.25rem' }}>
                  Face-to-face tutoring at your location or student&apos;s home
                </p>
              </div>
            </label>

            <label
              className={`${styles.checkboxItem} ${locationType === 'hybrid' ? styles.selected : ''}`}
              style={{ padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}
            >
              <input
                type="radio"
                name="location"
                checked={locationType === 'hybrid'}
                onChange={() => setLocationType('hybrid')}
                className={styles.checkboxInput}
                style={{ marginTop: '0.125rem' }}
              />
              <div style={{ marginLeft: '0.75rem' }}>
                <span className={styles.checkboxLabel}>🌐 Hybrid (Both)</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', marginTop: '0.25rem' }}>
                  Flexible - offer both online and in-person options
                </p>
              </div>
            </label>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label
              className={`${styles.checkboxItem} ${status === 'draft' ? styles.selected : ''}`}
              style={{ padding: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}
            >
              <input
                type="radio"
                name="status"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className={styles.checkboxInput}
                style={{ marginTop: '0.125rem' }}
              />
              <div style={{ marginLeft: '0.75rem' }}>
                <span className={styles.checkboxLabel}>Save as Draft</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', marginTop: '0.25rem' }}>
                  You can preview and edit before publishing
                </p>
              </div>
            </label>

            <label
              className={`${styles.checkboxItem} ${status === 'published' ? styles.selected : ''}`}
              style={{ padding: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}
            >
              <input
                type="radio"
                name="status"
                checked={status === 'published'}
                onChange={() => setStatus('published')}
                className={styles.checkboxInput}
                style={{ marginTop: '0.125rem' }}
              />
              <div style={{ marginLeft: '0.75rem' }}>
                <span className={styles.checkboxLabel}>Publish Now</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', marginTop: '0.25rem' }}>
                  Make your listing visible to students immediately
                </p>
              </div>
            </label>
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
