/**
 * Filename: OneToOneFields.tsx
 * Purpose: Type-specific fields for one-to-one tutoring listings
 * Usage: Provider (tutor/agent) one-to-one service type
 * Created: 2026-01-19
 */

import styles from '../shared/FormSections.module.css';

interface OneToOneFieldsProps {
  sessionDuration: string;
  onSessionDurationChange: (duration: string) => void;
  required?: boolean;
  errors?: Record<string, string>;
}

export function OneToOneFields({
  sessionDuration,
  onSessionDurationChange,
  required = true,
  errors = {},
}: OneToOneFieldsProps) {
  const SESSION_DURATION_OPTIONS = [
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
  ];

  return (
    <div className={styles.formSection}>
      <label className={styles.label}>
        Session Duration {required && <span className={styles.required}>*</span>}
      </label>
      <select
        value={sessionDuration}
        onChange={(e) => onSessionDurationChange(e.target.value)}
        className={`${styles.select} ${errors.sessionDuration ? styles.inputError : ''}`}
      >
        <option value="">Select duration</option>
        {SESSION_DURATION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errors.sessionDuration ? (
        <p className={styles.errorText}>{errors.sessionDuration}</p>
      ) : (
        <p className={styles.helperText}>Typical session length for one-to-one tutoring</p>
      )}
    </div>
  );
}
