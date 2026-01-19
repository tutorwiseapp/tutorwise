/**
 * Filename: StudyPackageFields.tsx
 * Purpose: Type-specific fields for study package listings
 * Usage: Provider (tutor/agent) study-package service type
 * Created: 2026-01-19
 */

import { useState } from 'react';
import styles from '../shared/FormSections.module.css';

interface StudyPackageFieldsProps {
  packageType: string;
  materialUrl?: string;
  onPackageTypeChange: (type: string) => void;
  onMaterialUrlChange?: (url: string) => void;
  required?: boolean;
  errors?: Record<string, string>;
}

export function StudyPackageFields({
  packageType,
  materialUrl = '',
  onPackageTypeChange,
  onMaterialUrlChange,
  required = true,
  errors = {},
}: StudyPackageFieldsProps) {
  const [showExamples, setShowExamples] = useState(false);

  const PACKAGE_TYPE_OPTIONS = [
    { value: 'exam-prep', label: 'Exam Preparation' },
    { value: 'skills-course', label: 'Skills Development Course' },
    { value: 'crash-course', label: 'Crash Course' },
    { value: 'term-package', label: 'Term Package' },
    { value: 'custom', label: 'Custom Package' },
  ];

  const packageExamples = [
    'Exam Prep: 10 sessions focused on GCSE Maths revision (£400)',
    'Skills Course: 8 weeks of creative writing development (£320)',
    'Crash Course: 5 intensive A-Level Physics sessions (£250)',
    'Term Package: Full term of weekly sessions (12 weeks, £480)',
  ];

  return (
    <div>
      {/* Package Type */}
      <div className={styles.formSection}>
        <label className={styles.label}>
          Package Type {required && <span className={styles.required}>*</span>}
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--color-primary-default, #006c67)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {showExamples ? 'Hide examples' : 'See examples'}
          </button>
        </label>

        {showExamples && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#f0f9ff',
              borderRadius: 'var(--border-radius-md, 8px)',
              marginBottom: '1rem',
            }}
          >
            <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Package examples:
            </p>
            <ul style={{ fontSize: '0.75rem', margin: 0, paddingLeft: '1.25rem' }}>
              {packageExamples.map((example, index) => (
                <li key={index} style={{ marginBottom: '0.25rem' }}>
                  {example}
                </li>
              ))}
            </ul>
            <p
              style={{
                fontSize: '0.75rem',
                marginTop: '0.5rem',
                color: 'var(--color-gray-600, #6B7280)',
                fontStyle: 'italic',
              }}
            >
              Tip: Packages offer better value and encourage commitment
            </p>
          </div>
        )}

        <select
          value={packageType}
          onChange={(e) => onPackageTypeChange(e.target.value)}
          className={`${styles.select} ${errors.packageType ? styles.inputError : ''}`}
        >
          <option value="">Select package type</option>
          {PACKAGE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.packageType ? (
          <p className={styles.errorText}>{errors.packageType}</p>
        ) : (
          <p className={styles.helperText}>Choose the type that best describes your package</p>
        )}
      </div>

      {/* Material URL (Optional) */}
      {onMaterialUrlChange && (
        <div className={styles.formSection}>
          <label className={styles.label}>Course Materials URL (Optional)</label>
          <input
            type="url"
            value={materialUrl}
            onChange={(e) => onMaterialUrlChange(e.target.value)}
            placeholder="https://example.com/materials"
            className={`${styles.input} ${errors.materialUrl ? styles.inputError : ''}`}
            maxLength={500}
          />
          {errors.materialUrl ? (
            <p className={styles.errorText}>{errors.materialUrl}</p>
          ) : (
            <p className={styles.helperText}>
              Link to course materials, syllabus, or sample content (Google Drive, Dropbox, etc.)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
