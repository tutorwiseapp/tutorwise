/**
 * Filename: TutorPreferencesSection.tsx
 * Purpose: Client-specific tutor preferences (qualifications, experience)
 * Usage: Client request form only
 * Created: 2026-01-19
 */

import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import styles from '../shared/FormSections.module.css';

interface TutorPreferencesSectionProps {
  preferredQualifications: string[];
  preferredCredentials: string[];
  preferredTeachingExp: string;
  preferredTutorExp: string;
  onPreferredQualificationsChange: (qualifications: string[]) => void;
  onPreferredCredentialsChange: (credentials: string[]) => void;
  onPreferredTeachingExpChange: (exp: string) => void;
  onPreferredTutorExpChange: (exp: string) => void;
  errors?: Record<string, string>;
}

const ACADEMIC_QUALIFICATIONS_OPTIONS = [
  { value: 'University Degree', label: 'University Degree' },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: 'PhD', label: 'PhD' },
  { value: 'Professional Certificate', label: 'Professional Certificate' },
];

const TEACHING_CREDENTIALS_OPTIONS = [
  { value: 'QTLS, QTS', label: 'QTLS, QTS' },
  { value: 'PGCE', label: 'PGCE' },
  { value: 'Teaching License', label: 'Teaching License' },
  { value: 'None', label: 'None' },
];

const TEACHING_EXPERIENCE_OPTIONS = [
  { value: 'Any Experience Level', label: 'Any Experience Level' },
  { value: 'New Teacher (0-3 years)', label: 'New Teacher (0-3 years)' },
  { value: 'Experienced Teacher (4-7 years)', label: 'Experienced Teacher (4-7 years)' },
  { value: 'Senior Teacher (8+ years)', label: 'Senior Teacher (8+ years)' },
];

const TUTOR_EXPERIENCE_OPTIONS = [
  { value: 'New Tutor (0-2 years)', label: 'New Tutor (0-2 years)' },
  { value: 'Experienced Tutor (3-5 years)', label: 'Experienced Tutor (3-5 years)' },
  { value: 'Expert Tutor (5+ years)', label: 'Expert Tutor (5+ years)' },
];

export function TutorPreferencesSection({
  preferredQualifications,
  preferredCredentials,
  preferredTeachingExp,
  preferredTutorExp,
  onPreferredQualificationsChange,
  onPreferredCredentialsChange,
  onPreferredTeachingExpChange,
  onPreferredTutorExpChange,
  errors = {},
}: TutorPreferencesSectionProps) {
  return (
    <div className={styles.twoColumnLayout}>
      {/* Preferred Academic Qualifications */}
      <div className={styles.formSection}>
        <label className={styles.label}>Preferred Tutor Qualifications</label>
        <UnifiedMultiSelect
          triggerLabel={formatMultiSelectLabel(preferredQualifications, 'Select qualifications (optional)')}
          options={ACADEMIC_QUALIFICATIONS_OPTIONS}
          selectedValues={preferredQualifications}
          onSelectionChange={onPreferredQualificationsChange}
        />
        <p className={styles.helperText}>Optional: academic qualifications you prefer</p>
      </div>

      {/* Preferred Teaching Credentials */}
      <div className={styles.formSection}>
        <label className={styles.label}>Preferred Teaching Credentials</label>
        <UnifiedMultiSelect
          triggerLabel={formatMultiSelectLabel(preferredCredentials, 'Select credentials (optional)')}
          options={TEACHING_CREDENTIALS_OPTIONS}
          selectedValues={preferredCredentials}
          onSelectionChange={onPreferredCredentialsChange}
        />
        <p className={styles.helperText}>Optional: teaching credentials you prefer</p>
      </div>

      {/* Preferred Teaching Background */}
      <div className={styles.formSection}>
        <label className={styles.label}>Preferred Teaching Background</label>
        <select
          value={preferredTeachingExp}
          onChange={(e) => onPreferredTeachingExpChange(e.target.value)}
          className={styles.select}
        >
          <option value="">Select background (optional)...</option>
          {TEACHING_EXPERIENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className={styles.helperText}>Optional: teaching experience level</p>
      </div>

      {/* Preferred Tutor Experience Level */}
      <div className={styles.formSection}>
        <label className={styles.label}>Preferred Tutor Experience</label>
        <select
          value={preferredTutorExp}
          onChange={(e) => onPreferredTutorExpChange(e.target.value)}
          className={styles.select}
        >
          <option value="">Select experience (optional)...</option>
          {TUTOR_EXPERIENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className={styles.helperText}>Optional: tutoring experience level</p>
      </div>
    </div>
  );
}
