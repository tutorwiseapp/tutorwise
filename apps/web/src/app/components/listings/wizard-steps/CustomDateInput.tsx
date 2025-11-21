'use client';

import { useState, useRef, useEffect } from 'react';
import CustomCalendar from './CustomCalendar';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface CustomDateInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  label: string;
  error?: string;
  onClearError?: () => void;
  alignCalendar?: 'left' | 'right'; // Align calendar dropdown to left or right
}

export default function CustomDateInput({ value, onChange, label, error, onClearError, alignCalendar = 'left' }: CustomDateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
  };

  const handleDateChange = (date: string) => {
    onChange(date);
    if (onClearError) {
      onClearError();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label className={styles.formLabel}>{label}</label>
      {error && (
        <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
          {error}
        </p>
      )}
      <input
        type="text"
        value={formatDisplayDate(value)}
        onClick={() => setIsOpen(true)}
        readOnly
        className={styles.formInput}
        placeholder="MM/DD/YYYY"
        style={{ cursor: 'pointer' }}
      />
      {isOpen && (
        <CustomCalendar
          value={value}
          onChange={handleDateChange}
          onClose={() => setIsOpen(false)}
          align={alignCalendar}
        />
      )}
    </div>
  );
}
