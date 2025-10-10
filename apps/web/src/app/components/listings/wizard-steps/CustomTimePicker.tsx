'use client';

import { useState, useEffect } from 'react';
import styles from './CustomTimePicker.module.css';

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
    <div className={styles.timePickerContainer}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={value}
          onClick={() => setIsOpen(true)}
          readOnly
          className={styles.input}
          placeholder="Select time"
        />
      </div>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={handleCancel} />
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownTitle}>Select Time</span>
            </div>

            <div className={styles.selectorsContainer}>
              <div className={styles.selectorColumn}>
                <div className={styles.selectorLabel}>Hour</div>
                <div className={styles.selectorScroll}>
                  {hours.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHour(h)}
                      className={`${styles.selectorButton} ${hour === h ? styles.selected : ''}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.selectorColumn}>
                <div className={styles.selectorLabel}>Minute</div>
                <div className={styles.selectorScroll}>
                  {minutes.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinute(m)}
                      className={`${styles.selectorButton} ${minute === m ? styles.selected : ''}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.selectorColumn}>
                <div className={styles.selectorLabel}>Period</div>
                <div className={styles.selectorScroll}>
                  {['AM', 'PM'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p as 'AM' | 'PM')}
                      className={`${styles.selectorButton} ${period === p ? styles.selected : ''}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.dropdownFooter}>
              <button
                type="button"
                onClick={handleCancel}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className={styles.applyButton}
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
