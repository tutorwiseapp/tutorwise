/*
 * Filename: src/app/components/feature/listings/UnavailabilityFormSection.tsx
 * Purpose: Unavailability periods component for create listing form
 * Created: 2025-11-04
 * v4.0: Companion to AvailabilityFormSection for blocking out dates
 *
 * Features:
 * - Date range pickers (From/To)
 * - Multiple unavailability periods (vacations, holidays, etc.)
 * - Simple add/remove interface
 * - Matches ProfessionalInfoForm pattern
 */

'use client';

import { useState } from 'react';
import Button from '@/app/components/ui/actions/Button';
import styles from './AvailabilityFormSection.module.css'; // Reuse same styles

interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

interface UnavailabilityFormSectionProps {
  value: UnavailabilityPeriod[];
  onChange: (periods: UnavailabilityPeriod[]) => void;
}

export default function UnavailabilityFormSection({
  value = [],
  onChange,
}: UnavailabilityFormSectionProps) {
  // New period form state
  const [newPeriod, setNewPeriod] = useState<Partial<UnavailabilityPeriod>>({
    fromDate: '',
    toDate: '',
  });

  const handleAddPeriod = () => {
    // Validation
    if (!newPeriod.fromDate) {
      alert('Please select a start date');
      return;
    }

    if (!newPeriod.toDate) {
      alert('Please select an end date');
      return;
    }

    const period: UnavailabilityPeriod = {
      id: `unavail-${Date.now()}`,
      fromDate: newPeriod.fromDate,
      toDate: newPeriod.toDate,
    };

    onChange([...value, period]);

    // Reset form
    setNewPeriod({
      fromDate: '',
      toDate: '',
    });
  };

  const handleRemovePeriod = (id: string) => {
    onChange(value.filter(p => p.id !== id));
  };

  const formatPeriodDisplay = (period: UnavailabilityPeriod) => {
    return `${period.fromDate} - ${period.toDate}`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h4 className={styles.sectionTitle}>Unavailability Periods</h4>
      </div>

      {/* Existing Periods List */}
      {value.length > 0 && (
        <div className={styles.periodsList}>
          <h5 className={styles.listTitle}>Unavailable Periods</h5>
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
        <h5 className={styles.formTitle}>Add Unavailability Period</h5>

        {/* Date Range */}
        <div className={styles.dateRow}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="unavailFromDate">
              From
            </label>
            <input
              id="unavailFromDate"
              type="date"
              value={newPeriod.fromDate || ''}
              onChange={(e) => setNewPeriod({ ...newPeriod, fromDate: e.target.value })}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="unavailToDate">
              To
            </label>
            <input
              id="unavailToDate"
              type="date"
              value={newPeriod.toDate || ''}
              onChange={(e) => setNewPeriod({ ...newPeriod, toDate: e.target.value })}
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
