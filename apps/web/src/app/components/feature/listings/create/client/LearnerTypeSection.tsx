/**
 * Filename: LearnerTypeSection.tsx
 * Purpose: Client-specific "Who Needs Tutoring?" section
 * Usage: Client request form only
 * Created: 2026-01-19
 */

import styles from '../shared/FormSections.module.css';

interface LearnerTypeSectionProps {
  learnerType: string;
  onLearnerTypeChange: (type: string) => void;
  required?: boolean;
  errors?: Record<string, string>;
}

const LEARNER_TYPE_OPTIONS = [
  { value: 'Myself (Adult Learner)', label: 'Myself (Adult Learner)' },
  { value: 'My Child/Student (Primary)', label: 'My Child/Student (Primary)' },
  { value: 'My Child/Student (Secondary)', label: 'My Child/Student (Secondary)' },
  { value: 'My Child/Student (College/University)', label: 'My Child/Student (College/University)' },
];

export function LearnerTypeSection({
  learnerType,
  onLearnerTypeChange,
  required = true,
  errors = {},
}: LearnerTypeSectionProps) {
  return (
    <div className={styles.formSection}>
      <label className={styles.label}>
        Who Needs Tutoring? {required && <span className={styles.required}>*</span>}
      </label>
      <select
        value={learnerType}
        onChange={(e) => onLearnerTypeChange(e.target.value)}
        className={`${styles.select} ${errors.learnerType ? styles.inputError : ''}`}
      >
        <option value="">Select who needs tutoring...</option>
        {LEARNER_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {errors.learnerType && <p className={styles.errorText}>{errors.learnerType}</p>}
    </div>
  );
}
