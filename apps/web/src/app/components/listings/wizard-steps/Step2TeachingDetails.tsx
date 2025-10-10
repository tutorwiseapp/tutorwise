'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface Step2Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

const SUBJECTS = [
  'Mathematics',
  'English',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Computer Science',
  'Economics',
  'Business Studies',
  'Psychology',
  'Sociology',
  'Art',
  'Music',
  'Drama',
  'Physical Education',
  'Religious Studies',
  'Modern Foreign Languages',
  'Other'
];

const KEY_STAGES = [
  'Primary (KS1 & KS2)',
  'KS3',
  'GCSE',
  'A-Level',
  'IB',
  'Undergraduate',
  'Postgraduate',
  'Adult Learning',
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Arabic',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Korean',
  'Other'
];

export default function Step2TeachingDetails({ formData, onNext, onBack }: Step2Props) {
  const [subjects, setSubjects] = useState<string[]>(formData.subjects || []);
  const [levels, setLevels] = useState<string[]>(formData.levels || []);
  const [languages, setLanguages] = useState<string[]>(formData.languages || ['English']);
  const [errors, setErrors] = useState<{ subjects?: string; levels?: string }>({});

  const toggleSubject = (subject: string) => {
    setSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const toggleLevel = (level: string) => {
    setLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleLanguage = (language: string) => {
    setLanguages(prev =>
      prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]
    );
  };

  const validate = () => {
    const newErrors: { subjects?: string; levels?: string } = {};

    if (subjects.length === 0) {
      newErrors.subjects = 'Please select at least one subject';
    }

    if (levels.length === 0) {
      newErrors.levels = 'Please select at least one education level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext({ subjects, levels, languages });
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>What Do You Teach?</h1>
        <p className={styles.stepSubtitle}>
          Select the subjects and levels you teach to help students find you
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Subjects */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Subjects <span style={{ color: 'var(--color-error, #dc2626)' }}>*</span>
          </label>
          {errors.subjects && (
            <p style={{ color: 'var(--color-error, #dc2626)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {errors.subjects}
            </p>
          )}
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Select all subjects you teach (you can offer different rates for each later)
          </p>
          <div className={styles.checkboxGroup}>
            {SUBJECTS.map((subject) => (
              <div
                key={subject}
                className={`${styles.checkboxItem} ${subjects.includes(subject) ? styles.selected : ''}`}
                onClick={() => toggleSubject(subject)}
              >
                <input
                  type="checkbox"
                  checked={subjects.includes(subject)}
                  onChange={() => toggleSubject(subject)}
                  className={styles.checkboxInput}
                />
                <span className={styles.checkboxLabel}>{subject}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Education Levels */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Education Levels <span style={{ color: 'var(--color-error, #dc2626)' }}>*</span>
          </label>
          {errors.levels && (
            <p style={{ color: 'var(--color-error, #dc2626)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {errors.levels}
            </p>
          )}
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Which education levels do you teach?
          </p>
          <div className={styles.checkboxGroup}>
            {KEY_STAGES.map((level) => (
              <div
                key={level}
                className={`${styles.checkboxItem} ${levels.includes(level) ? styles.selected : ''}`}
                onClick={() => toggleLevel(level)}
              >
                <input
                  type="checkbox"
                  checked={levels.includes(level)}
                  onChange={() => toggleLevel(level)}
                  className={styles.checkboxInput}
                />
                <span className={styles.checkboxLabel}>{level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Languages Spoken
          </label>
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Which languages can you teach in?
          </p>
          <div className={styles.checkboxGroup}>
            {LANGUAGES.map((language) => (
              <div
                key={language}
                className={`${styles.checkboxItem} ${languages.includes(language) ? styles.selected : ''}`}
                onClick={() => toggleLanguage(language)}
              >
                <input
                  type="checkbox"
                  checked={languages.includes(language)}
                  onChange={() => toggleLanguage(language)}
                  className={styles.checkboxInput}
                />
                <span className={styles.checkboxLabel}>{language}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          <button onClick={onBack} className={styles.buttonSecondary}>
            ← Back
          </button>
        </div>
        <div className={styles.actionRight}>
          <button onClick={handleContinue} className={styles.buttonPrimary}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
