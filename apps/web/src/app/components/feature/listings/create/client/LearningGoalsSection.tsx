/**
 * Filename: LearningGoalsSection.tsx
 * Purpose: Client-specific learning goals/objectives section
 * Usage: Client request form only
 * Created: 2026-01-19
 * Enhancement: Added character counter and helpful examples
 */

import { useState } from 'react';
import styles from '../shared/FormSections.module.css';

interface LearningGoalsSectionProps {
  learningGoals: string;
  onLearningGoalsChange: (goals: string) => void;
  maxLength?: number;
  errors?: Record<string, string>;
}

export function LearningGoalsSection({
  learningGoals,
  onLearningGoalsChange,
  maxLength = 500,
  errors = {},
}: LearningGoalsSectionProps) {
  const charCount = learningGoals.length;
  const isNearMax = charCount > maxLength * 0.9;

  const examples = [
    'Improve GCSE Maths grade from C to A',
    'Prepare for 11+ entrance exam',
    'Build confidence in English writing',
    'Catch up after missing school due to illness',
  ];

  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className={`${styles.formSection} ${styles.fullWidth}`}>
      <label className={styles.label}>
        Specific Learning Goals
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
            Example goals:
          </p>
          <ul style={{ fontSize: '0.75rem', margin: 0, paddingLeft: '1.25rem' }}>
            {examples.map((example, index) => (
              <li key={index} style={{ marginBottom: '0.25rem' }}>
                {example}
              </li>
            ))}
          </ul>
        </div>
      )}

      <textarea
        value={learningGoals}
        onChange={(e) => onLearningGoalsChange(e.target.value)}
        placeholder="E.g., Improve from Grade C to A in GCSE Maths, prepare for specific exam, build confidence..."
        rows={4}
        className={`${styles.textarea} ${errors.learningGoals ? styles.inputError : ''}`}
        maxLength={maxLength}
      />
      {errors.learningGoals ? (
        <p className={styles.errorText}>{errors.learningGoals}</p>
      ) : (
        <p className={`${styles.helperText} ${isNearMax ? styles.warningText : ''}`}>
          {charCount}/{maxLength} characters • Be specific about what you want to achieve
        </p>
      )}
    </div>
  );
}
