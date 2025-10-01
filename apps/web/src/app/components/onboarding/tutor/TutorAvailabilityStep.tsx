'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

interface TutorAvailabilityStepProps {
  onNext: (availability: AvailabilityData) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

export interface AvailabilityData {
  hourlyRate: number;
  availability: string[];
  sessionTypes: string[];
}

const availabilityOptions = [
  { value: 'weekday_morning', label: 'Weekday Mornings', time: '6am - 12pm' },
  { value: 'weekday_afternoon', label: 'Weekday Afternoons', time: '12pm - 5pm' },
  { value: 'weekday_evening', label: 'Weekday Evenings', time: '5pm - 10pm' },
  { value: 'weekend_morning', label: 'Weekend Mornings', time: '6am - 12pm' },
  { value: 'weekend_afternoon', label: 'Weekend Afternoons', time: '12pm - 5pm' },
  { value: 'weekend_evening', label: 'Weekend Evenings', time: '5pm - 10pm' }
];

const sessionTypeOptions = [
  { value: 'one_on_one', label: 'One-on-One', icon: '👤' },
  { value: 'group', label: 'Group Sessions', icon: '👥' },
  { value: 'online', label: 'Online Sessions', icon: '💻' },
  { value: 'in_person', label: 'In-Person', icon: '🏠' }
];

const rateRanges = [
  { value: 25, label: '$25-35/hr', description: 'Entry level' },
  { value: 40, label: '$40-50/hr', description: 'Intermediate' },
  { value: 60, label: '$60-75/hr', description: 'Experienced' },
  { value: 80, label: '$80-100/hr', description: 'Expert' },
  { value: 100, label: '$100+/hr', description: 'Premium' }
];

const TutorAvailabilityStep: React.FC<TutorAvailabilityStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading
}) => {
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [availability, setAvailability] = useState<string[]>([]);
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);

  const handleAvailabilityToggle = (value: string) => {
    setAvailability(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleSessionTypeToggle = (value: string) => {
    setSessionTypes(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleNext = () => {
    if (hourlyRate > 0 && availability.length > 0 && sessionTypes.length > 0) {
      onNext({ hourlyRate, availability, sessionTypes });
    }
  };

  const isValid = hourlyRate > 0 && availability.length > 0 && sessionTypes.length > 0;

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Set your availability and rates
        </h2>
        <p className={styles.stepSubtitle}>
          Let students know when you&apos;re available and what you charge
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Hourly Rate */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Hourly Rate *
          </label>
          <div className={styles.roleGrid}>
            {rateRanges.map((range) => (
              <div
                key={range.value}
                className={`${styles.roleCard} ${hourlyRate === range.value ? styles.selected : ''}`}
                onClick={() => setHourlyRate(range.value)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.roleHeader}>
                  <h3 className={styles.roleTitle}>{range.label}</h3>
                  <div className={`${styles.roleCheckbox} ${hourlyRate === range.value ? styles.checked : ''}`}>
                    {hourlyRate === range.value && '✓'}
                  </div>
                </div>
                <p className={styles.roleDescription}>{range.description}</p>
              </div>
            ))}
          </div>
          <p className={styles.progressIndicator}>
            💡 You can adjust your rate anytime in settings
          </p>
        </div>

        {/* Availability */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            When are you available? * (Select all that apply)
          </label>
          <div className={styles.roleGrid}>
            {availabilityOptions.map((option) => (
              <div
                key={option.value}
                className={`${styles.roleCard} ${availability.includes(option.value) ? styles.selected : ''}`}
                onClick={() => handleAvailabilityToggle(option.value)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.roleHeader}>
                  <h3 className={styles.roleTitle}>{option.label}</h3>
                  <div className={`${styles.roleCheckbox} ${availability.includes(option.value) ? styles.checked : ''}`}>
                    {availability.includes(option.value) && '✓'}
                  </div>
                </div>
                <p className={styles.roleDescription}>{option.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Session Types */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Session Types * (Select all that apply)
          </label>
          <div className={styles.checkboxGroup}>
            {sessionTypeOptions.map((type) => (
              <div
                key={type.value}
                className={`${styles.checkboxItem} ${sessionTypes.includes(type.value) ? styles.selected : ''}`}
                onClick={() => handleSessionTypeToggle(type.value)}
              >
                <span style={{ marginRight: '8px' }}>{type.icon}</span>
                <label className={styles.checkboxLabel}>{type.label}</label>
              </div>
            ))}
          </div>
        </div>

        <p className={styles.progressIndicator}>
          {isValid ? '✓ All set! Ready to continue' : 'Please complete all required fields'}
        </p>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          {onBack && (
            <button
              onClick={onBack}
              className={styles.buttonSecondary}
              disabled={isLoading}
            >
              ← Back
            </button>
          )}
          <button
            onClick={onSkip}
            className={styles.buttonSecondary}
            disabled={isLoading}
          >
            Skip for now
          </button>
        </div>

        <div className={styles.actionRight}>
          <button
            onClick={handleNext}
            className={`${styles.buttonPrimary} ${!isValid ? styles.buttonDisabled : ''}`}
            disabled={!isValid || isLoading}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorAvailabilityStep;
