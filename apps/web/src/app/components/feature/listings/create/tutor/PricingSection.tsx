/**
 * Filename: PricingSection.tsx
 * Purpose: Provider-specific pricing section (hourly rate or package pricing)
 * Usage: Tutor and Agent service listings (context-aware for service type)
 * Created: 2026-01-19
 * Enhancement: Supports both hourly rates and package pricing
 */

import { useState } from 'react';
import styles from '../shared/FormSections.module.css';

type PricingType = 'hourly' | 'package' | 'both';

interface PricingSectionProps {
  hourlyRateMin?: string;
  hourlyRateMax?: string;
  packagePrice?: string;
  packageSessions?: string;
  onHourlyRateMinChange?: (rate: string) => void;
  onHourlyRateMaxChange?: (rate: string) => void;
  onPackagePriceChange?: (price: string) => void;
  onPackageSessionsChange?: (sessions: string) => void;
  pricingType?: PricingType;
  showHourlyRate?: boolean;
  showPackagePricing?: boolean;
  hourlyRateLabel?: string;
  packagePriceLabel?: string;
  required?: boolean;
  errors?: Record<string, string>;
}

export function PricingSection({
  hourlyRateMin = '',
  hourlyRateMax = '',
  packagePrice = '',
  packageSessions = '',
  onHourlyRateMinChange,
  onHourlyRateMaxChange,
  onPackagePriceChange,
  onPackageSessionsChange,
  pricingType = 'hourly',
  showHourlyRate = true,
  showPackagePricing = false,
  hourlyRateLabel = 'Hourly Rate',
  packagePriceLabel = 'Package Price',
  required = true,
  errors = {},
}: PricingSectionProps) {
  const [showExamples, setShowExamples] = useState(false);

  const pricingExamples = [
    'One-to-One: £30-50/hour (most common range)',
    'Group Sessions: £15-25/hour per student',
    'Workshop: £200-500 for 3-hour session',
    'Study Package: £400-800 for 10 sessions',
  ];

  return (
    <div>
      <div className={`${styles.formSection} ${styles.fullWidth}`}>
        <label className={styles.label}>
          Pricing {required && <span className={styles.required}>*</span>}
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
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
            {showExamples ? 'Hide pricing guide' : 'See pricing guide'}
          </button>
        </label>

        {showExamples && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#f0f9ff',
              borderRadius: 'var(--border-radius-md, 8px)',
              marginBottom: '1rem',
            }}
          >
            <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Typical pricing ranges:
            </p>
            <ul style={{ fontSize: '0.75rem', margin: 0, paddingLeft: '1.25rem' }}>
              {pricingExamples.map((example, index) => (
                <li key={index} style={{ marginBottom: '0.25rem' }}>
                  {example}
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
              Note: Set competitive rates based on your experience and qualifications
            </p>
          </div>
        )}
      </div>

      {/* Hourly Rate Section */}
      {showHourlyRate && onHourlyRateMinChange && (
        <div className={styles.twoColumnLayout}>
          <div className={styles.formSection}>
            <label className={styles.label}>
              {hourlyRateLabel} - Minimum {required && <span className={styles.required}>*</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-gray-700, #4B4B4B)',
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              >
                £
              </span>
              <input
                type="number"
                value={hourlyRateMin}
                onChange={(e) => onHourlyRateMinChange(e.target.value)}
                placeholder="30"
                className={`${styles.input} ${errors.hourlyRateMin ? styles.inputError : ''}`}
                style={{ paddingLeft: '1.75rem' }}
                min="1"
                step="1"
              />
            </div>
            {errors.hourlyRateMin && <p className={styles.errorText}>{errors.hourlyRateMin}</p>}
          </div>

          {onHourlyRateMaxChange && (
            <div className={styles.formSection}>
              <label className={styles.label}>
                {hourlyRateLabel} - Maximum (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-gray-700, #4B4B4B)',
                    fontSize: '1rem',
                    fontWeight: 500,
                  }}
                >
                  £
                </span>
                <input
                  type="number"
                  value={hourlyRateMax}
                  onChange={(e) => onHourlyRateMaxChange(e.target.value)}
                  placeholder="50"
                  className={`${styles.input} ${errors.hourlyRateMax ? styles.inputError : ''}`}
                  style={{ paddingLeft: '1.75rem' }}
                  min={hourlyRateMin || '1'}
                  step="1"
                />
              </div>
              <p className={styles.helperText}>Leave blank if you charge a fixed rate</p>
              {errors.hourlyRateMax && <p className={styles.errorText}>{errors.hourlyRateMax}</p>}
            </div>
          )}
        </div>
      )}

      {/* Package Pricing Section */}
      {showPackagePricing && onPackagePriceChange && onPackageSessionsChange && (
        <div className={styles.twoColumnLayout}>
          <div className={styles.formSection}>
            <label className={styles.label}>
              {packagePriceLabel} {required && <span className={styles.required}>*</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-gray-700, #4B4B4B)',
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              >
                £
              </span>
              <input
                type="number"
                value={packagePrice}
                onChange={(e) => onPackagePriceChange(e.target.value)}
                placeholder="400"
                className={`${styles.input} ${errors.packagePrice ? styles.inputError : ''}`}
                style={{ paddingLeft: '1.75rem' }}
                min="1"
                step="1"
              />
            </div>
            {errors.packagePrice && <p className={styles.errorText}>{errors.packagePrice}</p>}
          </div>

          <div className={styles.formSection}>
            <label className={styles.label}>
              Number of Sessions {required && <span className={styles.required}>*</span>}
            </label>
            <input
              type="number"
              value={packageSessions}
              onChange={(e) => onPackageSessionsChange(e.target.value)}
              placeholder="10"
              className={`${styles.input} ${errors.packageSessions ? styles.inputError : ''}`}
              min="1"
              step="1"
            />
            <p className={styles.helperText}>Total sessions included in this package</p>
            {errors.packageSessions && (
              <p className={styles.errorText}>{errors.packageSessions}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
