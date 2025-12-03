/*
 * Filename: src/app/components/feature/listings/AvailabilityFormSection.tsx
 * Purpose: Inline-editable availability component for create listing form
 * Created: 2025-11-04
 * v4.0: Visually identical to profile availability but form-integrated
 *
 * Features:
 * - Toggle between "Recurring" and "One-time" availability
 * - Day selection for recurring (Mon-Sun)
 * - Date range pickers for both types
 * - Start/End time pickers
 * - Multiple availability periods
 * - "Load from Profile" button
 */

'use client';

import { useState } from 'react';
import type { AvailabilityPeriod } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/actions/Button';
import styles from './AvailabilityFormSection.module.css';

interface AvailabilityFormSectionProps {
  value: AvailabilityPeriod[];
  onChange: (periods: AvailabilityPeriod[]) => void;
  onLoadFromProfile?: () => void;
  profileAvailability?: AvailabilityPeriod[];
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AvailabilityFormSection({
  value = [],
  onChange,
  onLoadFromProfile,
  profileAvailability = []
}: AvailabilityFormSectionProps) {
  // New period form state
  const [newPeriod, setNewPeriod] = useState<Partial<AvailabilityPeriod>>({
    type: 'recurring',
    days: [],
    fromDate: '',
    toDate: '',
    startTime: '09:00',
    endTime: '17:00',
  });

  const handleAddPeriod = () => {
    if (!newPeriod.startTime || !newPeriod.endTime) {
      return;
    }

    // Validation
    if (newPeriod.type === 'recurring' && (!newPeriod.days || newPeriod.days.length === 0)) {
      alert('Please select at least one day for recurring availability');
      return;
    }

    if (newPeriod.type === 'one-time' && !newPeriod.fromDate) {
      alert('Please select a date for one-time availability');
      return;
    }

    const period: AvailabilityPeriod = {
      id: `period-${Date.now()}`,
      type: newPeriod.type as 'recurring' | 'one-time',
      days: newPeriod.type === 'recurring' ? newPeriod.days : undefined,
      fromDate: newPeriod.fromDate || new Date().toISOString().split('T')[0],
      toDate: newPeriod.toDate,
      startTime: newPeriod.startTime!,
      endTime: newPeriod.endTime!,
    };

    onChange([...value, period]);

    // Reset form
    setNewPeriod({
      type: 'recurring',
      days: [],
      fromDate: '',
      toDate: '',
      startTime: '09:00',
      endTime: '17:00',
    });
  };

  const handleRemovePeriod = (id: string) => {
    onChange(value.filter(p => p.id !== id));
  };

  const handleDayToggle = (day: string) => {
    const currentDays = newPeriod.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    setNewPeriod({ ...newPeriod, days: newDays });
  };

  const handleLoadFromProfile = () => {
    if (onLoadFromProfile) {
      onLoadFromProfile();
    } else if (profileAvailability.length > 0) {
      onChange(profileAvailability);
    }
  };

  const formatPeriodDisplay = (period: AvailabilityPeriod) => {
    if (period.type === 'recurring') {
      const daysList = period.days?.join(', ') || '';
      return `Every ${daysList}, ${period.startTime} - ${period.endTime}`;
    } else {
      return `${period.fromDate}, ${period.startTime} - ${period.endTime}`;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header with Load from Profile link */}
      <div className={styles.header}>
        <h4 className={styles.sectionTitle}>Availability Periods</h4>
        {(onLoadFromProfile || profileAvailability.length > 0) && (
          <button
            type="button"
            onClick={handleLoadFromProfile}
            className={styles.loadLink}
          >
            Load from Profile
          </button>
        )}
      </div>

      {/* Existing Periods List */}
      {value.length > 0 && (
        <div className={styles.periodsList}>
          <h5 className={styles.listTitle}>Current Availability</h5>
          {value.map((period) => (
            <div key={period.id} className={styles.periodItem}>
              <span className={styles.periodText}>{formatPeriodDisplay(period)}</span>
              <button
                type="button"
                onClick={() => handleRemovePeriod(period.id)}
                className={styles.removeButton}
                aria-label="Remove period"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Period Form */}
      <div className={styles.addPeriodForm}>
        <h5 className={styles.formTitle}>Add Availability Period</h5>

        {/* Type Toggle */}
        <div className={styles.typeToggle}>
          <button
            type="button"
            className={`${styles.toggleButton} ${newPeriod.type === 'recurring' ? styles.active : ''}`}
            onClick={() => setNewPeriod({ ...newPeriod, type: 'recurring', days: [] })}
          >
            Recurring
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${newPeriod.type === 'one-time' ? styles.active : ''}`}
            onClick={() => setNewPeriod({ ...newPeriod, type: 'one-time', days: [] })}
          >
            One-time
          </button>
        </div>

        {/* Recurring: Days of Week */}
        {newPeriod.type === 'recurring' && (
          <div className={styles.daysGrid}>
            <label className={styles.label}>Days of Week</label>
            <div className={styles.daysButtons}>
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`${styles.dayButton} ${
                    newPeriod.days?.includes(day) ? styles.selected : ''
                  }`}
                  onClick={() => handleDayToggle(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date Range */}
        <div className={styles.dateRow}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="fromDate">
              From
            </label>
            <input
              id="fromDate"
              type="date"
              value={newPeriod.fromDate || ''}
              onChange={(e) => setNewPeriod({ ...newPeriod, fromDate: e.target.value })}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="toDate">
              To {newPeriod.type === 'recurring' ? '(Optional)' : ''}
            </label>
            <input
              id="toDate"
              type="date"
              value={newPeriod.toDate || ''}
              onChange={(e) => setNewPeriod({ ...newPeriod, toDate: e.target.value })}
              className={styles.input}
            />
          </div>
        </div>

        {/* Time Range */}
        <div className={styles.timeRow}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="startTime">
              Start time
            </label>
            <input
              id="startTime"
              type="time"
              value={newPeriod.startTime || ''}
              onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="endTime">
              End time
            </label>
            <input
              id="endTime"
              type="time"
              value={newPeriod.endTime || ''}
              onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
              className={styles.input}
            />
          </div>
        </div>

        {/* Add Button */}
        <Button
          type="button"
          variant="primary"
          onClick={handleAddPeriod}
          fullWidth
        >
          Add
        </Button>
      </div>
    </div>
  );
}
