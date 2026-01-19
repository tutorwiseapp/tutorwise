/**
 * Filename: GroupSessionFields.tsx
 * Purpose: Type-specific fields for group session listings
 * Usage: Provider (tutor/agent) group-session service type
 * Created: 2026-01-19
 */

import styles from '../shared/FormSections.module.css';

interface GroupSessionFieldsProps {
  sessionDuration: string;
  maxAttendees: number | string;
  onSessionDurationChange: (duration: string) => void;
  onMaxAttendeesChange: (attendees: string) => void;
  required?: boolean;
  errors?: Record<string, string>;
}

export function GroupSessionFields({
  sessionDuration,
  maxAttendees,
  onSessionDurationChange,
  onMaxAttendeesChange,
  required = true,
  errors = {},
}: GroupSessionFieldsProps) {
  const SESSION_DURATION_OPTIONS = [
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: '150', label: '2.5 hours' },
  ];

  return (
    <div className={styles.twoColumnLayout}>
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
          <p className={styles.helperText}>Length of each group session</p>
        )}
      </div>

      <div className={styles.formSection}>
        <label className={styles.label}>
          Max Attendees {required && <span className={styles.required}>*</span>}
        </label>
        <input
          type="number"
          value={maxAttendees}
          onChange={(e) => onMaxAttendeesChange(e.target.value)}
          placeholder="5"
          className={`${styles.input} ${errors.maxAttendees ? styles.inputError : ''}`}
          min="2"
          max="10"
          step="1"
        />
        {errors.maxAttendees ? (
          <p className={styles.errorText}>{errors.maxAttendees}</p>
        ) : (
          <p className={styles.helperText}>Between 2-10 students (recommended: 4-6)</p>
        )}
      </div>
    </div>
  );
}
