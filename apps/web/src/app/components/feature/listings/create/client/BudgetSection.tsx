/**
 * Filename: BudgetSection.tsx
 * Purpose: Client-specific budget section (maximum they can pay)
 * Usage: Client request form only
 * Created: 2026-01-19
 */

import { useState } from 'react';
import styles from '../shared/FormSections.module.css';

interface BudgetSectionProps {
  oneToOneBudget: string;
  groupBudget?: string;
  onOneToOneBudgetChange: (budget: string) => void;
  onGroupBudgetChange?: (budget: string) => void;
  showGroupBudget?: boolean;
  required?: boolean;
  errors?: Record<string, string>;
}

export function BudgetSection({
  oneToOneBudget,
  groupBudget = '',
  onOneToOneBudgetChange,
  onGroupBudgetChange,
  showGroupBudget = true,
  required = true,
  errors = {},
}: BudgetSectionProps) {
  return (
    <div className={styles.twoColumnLayout}>
      {/* One-to-One Budget */}
      <div className={styles.formSection}>
        <label className={styles.label}>
          Budget for One-to-One (per hour) {required && <span className={styles.required}>*</span>}
        </label>
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-gray-700, #4B4B4B)',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            £
          </span>
          <input
            type="number"
            value={oneToOneBudget}
            onChange={(e) => onOneToOneBudgetChange(e.target.value)}
            placeholder="50"
            className={`${styles.input} ${errors.oneToOneBudget ? styles.inputError : ''}`}
            style={{ paddingLeft: '1.75rem' }}
            min="1"
            step="1"
          />
        </div>
        {errors.oneToOneBudget && <p className={styles.errorText}>{errors.oneToOneBudget}</p>}
        <p className={styles.helperText}>Maximum you can pay per hour</p>
      </div>

      {/* Group Session Budget */}
      {showGroupBudget && onGroupBudgetChange && (
        <div className={styles.formSection}>
          <label className={styles.label}>
            Budget for Group Sessions (per hour)
          </label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-gray-700, #4B4B4B)',
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              £
            </span>
            <input
              type="number"
              value={groupBudget}
              onChange={(e) => onGroupBudgetChange(e.target.value)}
              placeholder="25"
              className={styles.input}
              style={{ paddingLeft: '1.75rem' }}
              min="1"
              step="1"
            />
          </div>
          <p className={styles.helperText}>Optional: for group sessions</p>
        </div>
      )}
    </div>
  );
}
