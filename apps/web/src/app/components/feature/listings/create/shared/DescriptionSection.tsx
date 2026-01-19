/**
 * Filename: DescriptionSection.tsx
 * Purpose: Reusable description textarea section
 * Usage: Both provider (service description) and client (learning needs)
 * Created: 2026-01-19
 */

import { useState, useEffect } from 'react';
import styles from './FormSections.module.css';

interface DescriptionSectionProps {
  description: string;
  onDescriptionChange: (description: string) => void;
  label?: string;
  placeholder?: string;
  helpText?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  errors?: Record<string, string>;
}

export function DescriptionSection({
  description,
  onDescriptionChange,
  label = 'Description',
  placeholder = 'Describe in detail...',
  helpText,
  minLength = 50,
  maxLength = 2000,
  required = true,
  errors = {},
}: DescriptionSectionProps) {
  const charCount = description.length;
  const isUnderMin = charCount < minLength;
  const isNearMax = charCount > maxLength * 0.9;
  const isOverMax = charCount > maxLength;

  return (
    <div className={`${styles.formSection} ${styles.fullWidth}`}>
      <label className={styles.label}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
        maxLength={maxLength}
      />
      {errors.description ? (
        <p className={styles.errorText}>{errors.description}</p>
      ) : (
        <div className={styles.helperText}>
          {isUnderMin ? (
            <span>
              Min. {minLength} characters ({charCount}/{maxLength})
            </span>
          ) : (
            <span>
              {charCount}/{maxLength} characters
            </span>
          )}
          {helpText && <span> • {helpText}</span>}
        </div>
      )}
    </div>
  );
}
