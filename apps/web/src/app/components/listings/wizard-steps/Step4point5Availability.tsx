'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import styles from '../../onboarding/OnboardingWizard.module.css';
import CustomDateInput from './CustomDateInput';
import CustomTimePicker from './CustomTimePicker';

interface Step4point5Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

type AvailabilityType = 'recurring' | 'one-time';

interface AvailabilityPeriod {
  id: string;
  type: AvailabilityType;
  days?: string[]; // For recurring (e.g., ['Monday', 'Wednesday'])
  fromDate: string;
  toDate?: string;
  startTime: string;
  endTime: string;
}

interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Step4point5Availability({ formData, onNext, onBack }: Step4point5Props) {
  // Availability state
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('recurring');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [availFromDate, setAvailFromDate] = useState('');
  const [availToDate, setAvailToDate] = useState('');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [availabilityPeriods, setAvailabilityPeriods] = useState<AvailabilityPeriod[]>([]);
  const [availErrors, setAvailErrors] = useState<{ days?: string; dates?: string; times?: string }>({});

  // Unavailability state
  const [unavailFromDate, setUnavailFromDate] = useState('');
  const [unavailToDate, setUnavailToDate] = useState('');
  const [unavailabilityPeriods, setUnavailabilityPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [unavailErrors, setUnavailErrors] = useState<{ dates?: string }>({});

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
    // Clear day error when user selects a day
    if (availErrors.days) {
      setAvailErrors(prev => ({ ...prev, days: undefined }));
    }
  };

  const validateAvailability = () => {
    const newErrors: { days?: string; dates?: string; times?: string } = {};

    if (availabilityType === 'recurring' && selectedDays.length === 0) {
      newErrors.days = 'Please select at least one day';
    }

    if (!availFromDate) {
      newErrors.dates = 'Please select a start date';
    }

    if (availabilityType === 'recurring' && !availToDate) {
      newErrors.dates = 'Please select an end date for recurring availability';
    }

    if (startTime >= endTime) {
      newErrors.times = 'End time must be after start time';
    }

    setAvailErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUnavailability = () => {
    const newErrors: { dates?: string } = {};

    if (!unavailFromDate) {
      newErrors.dates = 'Please select a start date';
    }

    if (!unavailToDate) {
      newErrors.dates = 'Please select an end date';
    }

    setUnavailErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAvailability = () => {
    if (!validateAvailability()) return;

    const newPeriod: AvailabilityPeriod = {
      id: Date.now().toString(),
      type: availabilityType,
      days: availabilityType === 'recurring' ? selectedDays : undefined,
      fromDate: availFromDate,
      toDate: availabilityType === 'recurring' ? availToDate : undefined,
      startTime,
      endTime
    };

    setAvailabilityPeriods([...availabilityPeriods, newPeriod]);

    // Reset form
    setSelectedDays([]);
    setAvailFromDate('');
    setAvailToDate('');
    setStartTime('9:00 AM');
    setEndTime('5:00 PM');
    setAvailErrors({});
  };

  const handleAddUnavailability = () => {
    if (!validateUnavailability()) return;

    const newPeriod: UnavailabilityPeriod = {
      id: Date.now().toString(),
      fromDate: unavailFromDate,
      toDate: unavailToDate
    };

    setUnavailabilityPeriods([...unavailabilityPeriods, newPeriod]);

    // Reset form
    setUnavailFromDate('');
    setUnavailToDate('');
    setUnavailErrors({});
  };

  const handleRemoveAvailability = (id: string) => {
    setAvailabilityPeriods(availabilityPeriods.filter(p => p.id !== id));
  };

  const handleRemoveUnavailability = (id: string) => {
    setUnavailabilityPeriods(unavailabilityPeriods.filter(p => p.id !== id));
  };

  const handleContinue = () => {
    // Note: Availability periods will be stored locally but not submitted yet
    // Backend integration pending
    onNext({});
  };

  const formatAvailabilityText = (period: AvailabilityPeriod) => {
    if (period.type === 'recurring') {
      const daysList = period.days?.join(', ');
      return `Every ${daysList}, ${period.startTime} - ${period.endTime}`;
    } else {
      return `${period.fromDate}, ${period.startTime} - ${period.endTime}`;
    }
  };

  const formatUnavailabilityText = (period: UnavailabilityPeriod) => {
    return `${period.fromDate} - ${period.toDate}`;
  };

  const recurringPeriods = availabilityPeriods.filter(p => p.type === 'recurring');
  const oneTimePeriods = availabilityPeriods.filter(p => p.type === 'one-time');

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>Set Your Availability</h1>
        <p className={styles.stepSubtitle}>
          Set your availability and unavailability periods
        </p>
      </div>

      <div className={styles.stepBody} style={{ marginTop: '40px' }}>
        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Left Column: Availability Period */}
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '24px' }}>
              Availability Period
            </h2>

            {/* Availability Type */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Availability Periods</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              </div>
            </div>

            {/* Days of Week (only for recurring) */}
            {availabilityType === 'recurring' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Days of Week</label>
                {availErrors.days && (
                  <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                    {availErrors.days}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
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
                <CustomDateInput
                  label="From"
                  value={availFromDate}
                  onChange={setAvailFromDate}
                  error={availErrors.dates}
                  onClearError={() => setAvailErrors(prev => ({ ...prev, dates: undefined }))}
                />
                {availabilityType === 'recurring' && (
                  <CustomDateInput
                    label="To"
                    value={availToDate}
                    onChange={setAvailToDate}
                    onClearError={() => setAvailErrors(prev => ({ ...prev, dates: undefined }))}
                  />
                )}
              </div>
            </div>

            {/* Time Pickers */}
            <div className={styles.formGroup}>
              {availErrors.times && (
                <p className={styles.errorText} style={{ marginBottom: '8px' }}>
                  {availErrors.times}
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <CustomTimePicker
                  label="Start time"
                  value={startTime}
                  onChange={setStartTime}
                  onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                />
                <CustomTimePicker
                  label="End time"
                  value={endTime}
                  onChange={setEndTime}
                  onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                />
              </div>
            </div>

            {/* Add Button */}
            <div style={{ marginBottom: '32px' }}>
              <button
                type="button"
                onClick={handleAddAvailability}
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
                      <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAvailability(period.id)}
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
                      <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAvailability(period.id)}
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

          {/* Right Column: Unavailability Period */}
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '24px' }}>
              Unavailability Period
            </h2>

            {/* Date Pickers */}
            <div className={styles.formGroup}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <CustomDateInput
                  label="From"
                  value={unavailFromDate}
                  onChange={setUnavailFromDate}
                  error={unavailErrors.dates}
                  onClearError={() => setUnavailErrors(prev => ({ ...prev, dates: undefined }))}
                />
                <CustomDateInput
                  label="To"
                  value={unavailToDate}
                  onChange={setUnavailToDate}
                  onClearError={() => setUnavailErrors(prev => ({ ...prev, dates: undefined }))}
                />
              </div>
            </div>

            {/* Add Button */}
            <div style={{ marginBottom: '32px' }}>
              <button
                type="button"
                onClick={handleAddUnavailability}
                className={styles.buttonPrimary}
                style={{ width: '100%' }}
              >
                Add
              </button>
            </div>

            {/* Summary Section */}
            {unavailabilityPeriods.length > 0 && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Unavailable Period</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unavailabilityPeriods.map(period => (
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
                      <span style={{ fontSize: '0.875rem' }}>{formatUnavailabilityText(period)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUnavailability(period.id)}
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
        </div>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          <button onClick={onBack} className={styles.buttonSecondary}>
            Back
          </button>
        </div>
        <div className={styles.actionRight}>
          <button onClick={handleContinue} className={styles.buttonPrimary}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
