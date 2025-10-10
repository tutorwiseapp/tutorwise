'use client';

import { useState, useEffect } from 'react';
import timePickerStyles from './CustomTimePicker.module.css';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface CustomTimePickerProps {
  value: string; // "9:00 AM" format
  onChange: (time: string) => void;
  label: string;
  onClearError?: () => void;
}

export default function CustomTimePicker({ value, onChange, label, onClearError }: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState('9');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    // Parse the value to set initial state
    if (value) {
      const match = value.match(/^(\d+):(\d+)\s(AM|PM)$/);
      if (match) {
        setHour(match[1]);
        setMinute(match[2]);
        setPeriod(match[3] as 'AM' | 'PM');
      }
    }
  }, [value]);

  const hours = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const handleApply = () => {
    const timeString = `${hour}:${minute} ${period}`;
    onChange(timeString);
    if (onClearError) {
      onClearError();
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to current value
    if (value) {
      const match = value.match(/^(\d+):(\d+)\s(AM|PM)$/);
      if (match) {
        setHour(match[1]);
        setMinute(match[2]);
        setPeriod(match[3] as 'AM' | 'PM');
      }
    }
    setIsOpen(false);
  };

  return (
    <div className={timePickerStyles.timePickerContainer}>
      <label className={styles.formLabel}>{label}</label>
      <div className={timePickerStyles.inputWrapper}>
        <input
          type="text"
          value={value}
          onClick={() => setIsOpen(true)}
          readOnly
          className={styles.formInput}
          placeholder="Select time"
          style={{ cursor: 'pointer' }}
        />
      </div>

      {isOpen && (
        <>
          <div className={timePickerStyles.overlay} onClick={handleCancel} />
          <div className={timePickerStyles.dropdown}>
            <div className={timePickerStyles.dropdownHeader}>
              <span className={timePickerStyles.dropdownTitle}>Select Time</span>
            </div>

            <div className={timePickerStyles.selectorsContainer}>
              <div className={timePickerStyles.selectorColumn}>
                <div className={timePickerStyles.selectorLabel}>Hour</div>
                <div className={timePickerStyles.selectorScroll}>
                  {hours.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHour(h)}
                      className={`${timePickerStyles.selectorButton} ${hour === h ? timePickerStyles.selected : ''}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className={timePickerStyles.selectorColumn}>
                <div className={timePickerStyles.selectorLabel}>Minute</div>
                <div className={timePickerStyles.selectorScroll}>
                  {minutes.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinute(m)}
                      className={`${timePickerStyles.selectorButton} ${minute === m ? timePickerStyles.selected : ''}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className={timePickerStyles.selectorColumn}>
                <div className={timePickerStyles.selectorLabel}>Period</div>
                <div className={timePickerStyles.selectorScroll}>
                  {['AM', 'PM'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p as 'AM' | 'PM')}
                      className={`${timePickerStyles.selectorButton} ${period === p ? timePickerStyles.selected : ''}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={timePickerStyles.dropdownFooter}>
              <button
                type="button"
                onClick={handleCancel}
                className={timePickerStyles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className={timePickerStyles.applyButton}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
