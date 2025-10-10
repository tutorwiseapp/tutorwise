'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface Step4Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

const HOURLY_RATE_RANGES = [
  { value: 20, label: '£15 - £20 per hour' },
  { value: 25, label: '£20 - £25 per hour' },
  { value: 30, label: '£25 - £30 per hour' },
  { value: 35, label: '£30 - £40 per hour' },
  { value: 45, label: '£40 - £50 per hour' },
  { value: 60, label: '£50 - £70 per hour' },
  { value: 85, label: '£70 - £100 per hour' },
  { value: 100, label: '£100+ per hour' },
];

export default function Step4PricingAvailability({ formData, onNext, onBack }: Step4Props) {
  const [hourlyRate, setHourlyRate] = useState(formData.hourly_rate || 0);
  const [freeTrial, setFreeTrial] = useState(formData.free_trial || false);
  const [trialDuration, setTrialDuration] = useState(formData.trial_duration_minutes || 30);
  const [errors, setErrors] = useState<{ hourlyRate?: string }>({});

  const validate = () => {
    const newErrors: { hourlyRate?: string } = {};

    if (!hourlyRate || hourlyRate <= 0) {
      newErrors.hourlyRate = 'Please select an hourly rate';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext({
        hourly_rate: hourlyRate,
        free_trial: freeTrial,
        trial_duration_minutes: freeTrial ? trialDuration : undefined,
      });
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>Set Your Rate</h1>
        <p className={styles.stepSubtitle}>
          Choose your hourly rate and trial options
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Hourly Rate */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Hourly Rate <span style={{ color: 'var(--color-error, #dc2626)' }}>*</span>
          </label>
          {errors.hourlyRate && (
            <p style={{ color: 'var(--color-error, #dc2626)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {errors.hourlyRate}
            </p>
          )}
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Select your typical hourly rate (you can adjust per session)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {HOURLY_RATE_RANGES.map((range) => (
              <label
                key={range.value}
                className={`${styles.checkboxItem} ${hourlyRate === range.value ? styles.selected : ''}`}
                style={{ padding: '1rem', cursor: 'pointer' }}
                onClick={() => setHourlyRate(range.value)}
              >
                <input
                  type="radio"
                  checked={hourlyRate === range.value}
                  onChange={() => setHourlyRate(range.value)}
                  className={styles.checkboxInput}
                />
                <span className={styles.checkboxLabel}>{range.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Free Trial */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Free Trial Lesson (Optional)
          </label>
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Offering a free trial can help you attract more students
          </p>
          <div className={styles.checkboxGroup}>
            <div
              className={`${styles.checkboxItem} ${freeTrial ? styles.selected : ''}`}
              onClick={() => setFreeTrial(!freeTrial)}
            >
              <input
                type="checkbox"
                checked={freeTrial}
                onChange={() => setFreeTrial(!freeTrial)}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxLabel}>Yes, I offer a free trial lesson</span>
            </div>
          </div>
        </div>

        {/* Trial Duration */}
        {freeTrial && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Trial Duration
            </label>
            <div className={styles.checkboxGroup}>
              {[15, 30, 45, 60].map((mins) => (
                <div
                  key={mins}
                  className={`${styles.checkboxItem} ${trialDuration === mins ? styles.selected : ''}`}
                  onClick={() => setTrialDuration(mins)}
                >
                  <input
                    type="radio"
                    checked={trialDuration === mins}
                    onChange={() => setTrialDuration(mins)}
                    className={styles.checkboxInput}
                  />
                  <span className={styles.checkboxLabel}>{mins} minutes</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
