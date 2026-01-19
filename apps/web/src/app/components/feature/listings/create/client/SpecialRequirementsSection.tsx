/**
 * Filename: SpecialRequirementsSection.tsx
 * Purpose: Client-specific special requirements section (SEN, accessibility, learning style)
 * Usage: Client request form only
 * Created: 2026-01-19
 * Enhancement: Added helpful examples and guidance for sensitive requirements
 */

import { useState } from 'react';
import styles from '../shared/FormSections.module.css';

interface SpecialRequirementsSectionProps {
  specialRequirements: string;
  onSpecialRequirementsChange: (requirements: string) => void;
  maxLength?: number;
  errors?: Record<string, string>;
}

export function SpecialRequirementsSection({
  specialRequirements,
  onSpecialRequirementsChange,
  maxLength = 500,
  errors = {},
}: SpecialRequirementsSectionProps) {
  const charCount = specialRequirements.length;
  const isNearMax = charCount > maxLength * 0.9;

  const examples = [
    'Dyslexia support with multi-sensory learning approach',
    'ADHD - needs movement breaks and visual aids',
    'Autism spectrum - prefers structured routines and clear instructions',
    'Anxiety - requires patient, encouraging approach',
    'Visual or hearing impairment accommodations',
  ];

  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className={`${styles.formSection} ${styles.fullWidth}`}>
      <label className={styles.label}>
        Special Requirements or Learning Needs (Optional)
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
            marginBottom: '0.5rem',
          }}
        >
          <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Example requirements:
          </p>
          <ul style={{ fontSize: '0.75rem', margin: 0, paddingLeft: '1.25rem' }}>
            {examples.map((example, index) => (
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
            Note: Sharing specific needs helps us match you with tutors who have relevant experience
            and training.
          </p>
        </div>
      )}

      <textarea
        value={specialRequirements}
        onChange={(e) => onSpecialRequirementsChange(e.target.value)}
        placeholder="E.g., SEN requirements, learning style preferences, accessibility needs, or other considerations..."
        rows={4}
        className={`${styles.textarea} ${errors.specialRequirements ? styles.inputError : ''}`}
        maxLength={maxLength}
      />
      {errors.specialRequirements ? (
        <p className={styles.errorText}>{errors.specialRequirements}</p>
      ) : (
        <p className={`${styles.helperText} ${isNearMax ? styles.warningText : ''}`}>
          {charCount}/{maxLength} characters • This information helps us find the right tutor for
          your needs
        </p>
      )}
    </div>
  );
}
