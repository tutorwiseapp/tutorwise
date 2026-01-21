/**
 * Filename: ImagesSection.tsx
 * Purpose: Provider-specific images section (service/profile images)
 * Usage: Tutor and Agent service listings
 * Created: 2026-01-19
 * Enhancement: Wraps existing ImageUpload component with helpful guidance
 */

import { useState, useRef } from 'react';
import ImageUpload, { ImageUploadRef } from '@/app/components/feature/listings/create/shared-components/ImageUpload';
import styles from '../shared/FormSections.module.css';

interface ImagesSectionProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  label?: string;
  helpText?: string;
  maxImages?: number;
  required?: boolean;
  errors?: Record<string, string>;
}

export function ImagesSection({
  images,
  onImagesChange,
  label = 'Service Images',
  helpText = 'Upload photos that showcase your teaching environment, materials, or professional headshot',
  maxImages = 5,
  required = false,
  errors = {},
}: ImagesSectionProps) {
  const [showTips, setShowTips] = useState(false);
  const imageUploadRef = useRef<ImageUploadRef>(null);

  const imageTips = [
    'Professional headshot (recommended as first image)',
    'Teaching environment or workspace',
    'Educational materials or resources you use',
    'Certificates or qualifications',
    'Student work samples (with permission)',
  ];

  const handleUploadComplete = (uploadedUrls: string[]) => {
    onImagesChange(uploadedUrls);
  };

  return (
    <div className={`${styles.formSection} ${styles.fullWidth}`}>
      <label className={styles.label}>
        {label} {required && <span className={styles.required}>*</span>}
        <button
          type="button"
          onClick={() => setShowTips(!showTips)}
          style={{
            marginLeft: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--color-primary-default, #006c67)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {showTips ? 'Hide tips' : 'See photo tips'}
        </button>
      </label>

      {showTips && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#f0f9ff',
            borderRadius: 'var(--border-radius-md, 8px)',
            marginBottom: '1rem',
          }}
        >
          <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Photo suggestions:
          </p>
          <ul style={{ fontSize: '0.75rem', margin: 0, paddingLeft: '1.25rem' }}>
            {imageTips.map((tip, index) => (
              <li key={index} style={{ marginBottom: '0.25rem' }}>
                {tip}
              </li>
            ))}
          </ul>
          <p
            style={{
              fontSize: '0.75rem',
              marginTop: '0.5rem',
              color: 'var(--color-gray-600, #6B7280)',
              fontStyle: 'italic',
            }}
          >
            Tip: Listings with professional photos receive 3x more views
          </p>
        </div>
      )}

      <ImageUpload
        ref={imageUploadRef}
        onUploadComplete={handleUploadComplete}
        existingImages={images}
      />

      {errors.images ? (
        <p className={styles.errorText}>{errors.images}</p>
      ) : (
        <p className={styles.helperText}>
          {images.length}/{maxImages} images • {helpText}
        </p>
      )}
    </div>
  );
}
