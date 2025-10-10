'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface Step4point5Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

type AvailabilityType = 'recurring' | 'one-time' | 'unavailable';

interface AvailabilityPeriod {
  id: string;
  type: AvailabilityType;
  days?: string[]; // For recurring (e.g., ['Monday', 'Wednesday'])
  fromDate: string;
  toDate?: string;
  startTime: string;
  endTime: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_OPTIONS = [
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM',
  '3:00 AM', '3:30 AM', '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM',
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

export default function Step4point5Availability({ formData, onNext, onBack }: Step4point5Props) {
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('recurring');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>([]);
  const [errors, setErrors] = useState<{ days?: string; dates?: string; times?: string }>({});

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const validate = () => {
    const newErrors: { days?: string; dates?: string; times?: string } = {};

    if (availabilityType === 'recurring' && selectedDays.length === 0) {
      newErrors.days = 'Please select at least one day';
    }

    if (!fromDate) {
      newErrors.dates = 'Please select a start date';
    }

    if (availabilityType === 'recurring' && !toDate) {
      newErrors.dates = 'Please select an end date for recurring availability';
    }

    if (startTime >= endTime) {
      newErrors.times = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;

    const newPeriod: AvailabilityPeriod = {
      id: Date.now().toString(),
      type: availabilityType,
      days: availabilityType === 'recurring' ? selectedDays : undefined,
      fromDate,
      toDate: availabilityType === 'recurring' ? toDate : undefined,
      startTime,
      endTime
    };

    setPeriods([...periods, newPeriod]);

    // Reset form
    setSelectedDays([]);
    setFromDate('');
    setToDate('');
    setStartTime('9:00 AM');
    setEndTime('5:00 PM');
    setErrors({});
  };

  const handleRemove = (id: string) => {
    setPeriods(periods.filter(p => p.id !== id));
  };

  const handleContinue = () => {
    // Note: Availability periods will be stored locally but not submitted yet
    // Backend integration pending
    onNext({});
  };

  const formatPeriodText = (period: AvailabilityPeriod) => {
    if (period.type === 'recurring') {
      const daysList = period.days?.join(', ');
      return `Every ${daysList}, ${period.startTime} - ${period.endTime}`;
    } else if (period.type === 'one-time') {
      return `${period.fromDate}, ${period.startTime} - ${period.endTime}`;
    } else {
      return `${period.fromDate} - ${period.toDate || period.fromDate}`;
    }
  };

  const recurringPeriods = periods.filter(p => p.type === 'recurring');
  const oneTimePeriods = periods.filter(p => p.type === 'one-time');
  const unavailablePeriods = periods.filter(p => p.type === 'unavailable');

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>Set Your Availability</h1>
        <p className={styles.stepSubtitle}>
          Set your availability and unavailability periods
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Availability Type */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Availability Periods</label>
          <div className={styles.checkboxGroup}>
            <button
              type="button"
              className={`${styles.checkboxItem} ${availabilityType === 'recurring' ? styles.selected : ''}`}
              onClick={() => setAvailabilityType('recurring')}
            >
              Recurring
            </button>
            <button
              type="button"
              className={`${styles.checkboxItem} ${availabilityType === 'one-time' ? styles.selected : ''}`}
              onClick={() => setAvailabilityType('one-time')}
            >
              One-time
            </button>
            <button
              type="button"
              className={`${styles.checkboxItem} ${availabilityType === 'unavailable' ? styles.selected : ''}`}
              onClick={() => setAvailabilityType('unavailable')}
            >
              Unavailable
            </button>
          </div>
        </div>

        {/* Days of Week (only for recurring) */}
        {availabilityType === 'recurring' && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Days of Week</label>
            {errors.days && <p className={styles.errorText}>{errors.days}</p>}
            <div className={styles.checkboxGroup}>
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  type="button"
                  className={`${styles.checkboxItem} ${selectedDays.includes(day) ? styles.selected : ''}`}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date Pickers */}
        <div className={styles.formGroup}>
          <div style={{ display: 'grid', gridTemplateColumns: availabilityType === 'recurring' ? '1fr 1fr' : '1fr', gap: '16px' }}>
            <div>
              <label className={styles.formLabel}>
                {availabilityType === 'unavailable' ? 'From' : 'Date'}
              </label>
              {errors.dates && <p className={styles.errorText}>{errors.dates}</p>}
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={styles.formInput}
              />
            </div>
            {(availabilityType === 'recurring' || availabilityType === 'unavailable') && (
              <div>
                <label className={styles.formLabel}>To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={styles.formInput}
                />
              </div>
            )}
          </div>
        </div>

        {/* Time Pickers (not for unavailable) */}
        {availabilityType !== 'unavailable' && (
          <div className={styles.formGroup}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className={styles.formLabel}>Start time</label>
                {errors.times && <p className={styles.errorText}>{errors.times}</p>}
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={styles.formInput}
                >
                  {TIME_OPTIONS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={styles.formLabel}>End time</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={styles.formInput}
                >
                  {TIME_OPTIONS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Add Button */}
        <div style={{ marginBottom: '32px' }}>
          <button
            type="button"
            onClick={handleAdd}
            className={styles.buttonPrimary}
            style={{ width: '100%' }}
          >
            Add
          </button>
        </div>

        {/* Summary Sections */}
        {recurringPeriods.length > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Recurring Availability</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recurringPeriods.map(period => (
                <div
                  key={period.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #dfe1e5)'
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>{formatPeriodText(period)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(period.id)}
                    className={styles.buttonSecondary}
                    style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {oneTimePeriods.length > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>One-time Availability</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {oneTimePeriods.map(period => (
                <div
                  key={period.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #dfe1e5)'
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>{formatPeriodText(period)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(period.id)}
                    className={styles.buttonSecondary}
                    style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {unavailablePeriods.length > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Unavailable Period</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {unavailablePeriods.map(period => (
                <div
                  key={period.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #dfe1e5)'
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>{formatPeriodText(period)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(period.id)}
                    className={styles.buttonSecondary}
                    style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                  >
                    Remove
                  </button>
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
