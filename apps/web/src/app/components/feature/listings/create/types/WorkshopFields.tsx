/**
 * Filename: WorkshopFields.tsx
 * Purpose: Type-specific fields for workshop listings
 * Usage: Provider (tutor/agent) workshop service type
 * Created: 2026-01-19
 */

import styles from '../shared/FormSections.module.css';

interface WorkshopFieldsProps {
  maxAttendees: number | string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  onMaxAttendeesChange: (attendees: string) => void;
  onEventDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onLocationChange: (location: string) => void;
  required?: boolean;
  errors?: Record<string, string>;
}

export function WorkshopFields({
  maxAttendees,
  eventDate,
  startTime,
  endTime,
  location,
  onMaxAttendeesChange,
  onEventDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onLocationChange,
  required = true,
  errors = {},
}: WorkshopFieldsProps) {
  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Max Participants */}
      <div className={styles.formSection}>
        <label className={styles.label}>
          Max Participants {required && <span className={styles.required}>*</span>}
        </label>
        <input
          type="number"
          value={maxAttendees}
          onChange={(e) => onMaxAttendeesChange(e.target.value)}
          placeholder="50"
          className={`${styles.input} ${errors.maxAttendees ? styles.inputError : ''}`}
          min="10"
          max="500"
          step="1"
        />
        {errors.maxAttendees ? (
          <p className={styles.errorText}>{errors.maxAttendees}</p>
        ) : (
          <p className={styles.helperText}>Between 10-500 participants</p>
        )}
      </div>

      {/* Event Date and Time */}
      <div className={styles.twoColumnLayout}>
        <div className={styles.formSection}>
          <label className={styles.label}>
            Event Date {required && <span className={styles.required}>*</span>}
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => onEventDateChange(e.target.value)}
            className={`${styles.input} ${errors.eventDate ? styles.inputError : ''}`}
            min={today}
          />
          {errors.eventDate && <p className={styles.errorText}>{errors.eventDate}</p>}
        </div>

        <div className={styles.formSection}>
          <label className={styles.label}>
            Start Time {required && <span className={styles.required}>*</span>}
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className={`${styles.input} ${errors.startTime ? styles.inputError : ''}`}
          />
          {errors.startTime && <p className={styles.errorText}>{errors.startTime}</p>}
        </div>
      </div>

      <div className={styles.twoColumnLayout}>
        <div className={styles.formSection}>
          <label className={styles.label}>
            End Time {required && <span className={styles.required}>*</span>}
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className={`${styles.input} ${errors.endTime ? styles.inputError : ''}`}
          />
          {errors.endTime && <p className={styles.errorText}>{errors.endTime}</p>}
        </div>

        <div className={styles.formSection}>
          <label className={styles.label}>
            Location {required && <span className={styles.required}>*</span>}
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="E.g., London Community Centre, Room 3"
            className={`${styles.input} ${errors.location ? styles.inputError : ''}`}
            maxLength={200}
          />
          {errors.location ? (
            <p className={styles.errorText}>{errors.location}</p>
          ) : (
            <p className={styles.helperText}>Venue name and/or online meeting link</p>
          )}
        </div>
      </div>
    </div>
  );
}
