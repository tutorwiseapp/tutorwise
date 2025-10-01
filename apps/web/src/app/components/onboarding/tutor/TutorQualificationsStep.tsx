'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

interface TutorQualificationsStepProps {
  onNext: (qualifications: QualificationsData) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

export interface QualificationsData {
  experience: string;
  education: string;
  certifications: string[];
  bio: string;
}

const experienceLevels = [
  { value: 'beginner', label: 'New to tutoring', description: '0-1 years' },
  { value: 'intermediate', label: 'Some experience', description: '1-3 years' },
  { value: 'experienced', label: 'Experienced tutor', description: '3-5 years' },
  { value: 'expert', label: 'Expert tutor', description: '5+ years' }
];

const educationLevels = [
  { value: 'high_school', label: 'High School' },
  { value: 'some_college', label: 'Some College' },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'phd', label: 'Ph.D. or Doctorate' }
];

const commonCertifications = [
  'Teaching Certificate',
  'TESOL/TEFL',
  'Subject-Specific Certification',
  'Tutoring Certification',
  'None yet'
];

const TutorQualificationsStep: React.FC<TutorQualificationsStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading
}) => {
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [bio, setBio] = useState('');

  const handleCertificationToggle = (cert: string) => {
    setCertifications(prev =>
      prev.includes(cert)
        ? prev.filter(c => c !== cert)
        : [...prev, cert]
    );
  };

  const handleNext = () => {
    if (experience && education && bio.length >= 50) {
      onNext({ experience, education, certifications, bio });
    }
  };

  const isValid = experience && education && bio.length >= 50;

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Tell us about your qualifications
        </h2>
        <p className={styles.stepSubtitle}>
          Help students understand why you&apos;re the perfect tutor for them
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Experience Level */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Teaching Experience *
          </label>
          <div className={styles.roleGrid}>
            {experienceLevels.map((level) => (
              <div
                key={level.value}
                className={`${styles.roleCard} ${experience === level.value ? styles.selected : ''}`}
                onClick={() => setExperience(level.value)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.roleHeader}>
                  <h3 className={styles.roleTitle}>{level.label}</h3>
                  <div className={`${styles.roleCheckbox} ${experience === level.value ? styles.checked : ''}`}>
                    {experience === level.value && '✓'}
                  </div>
                </div>
                <p className={styles.roleDescription}>{level.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Highest Education Level *
          </label>
          <select
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            className={styles.formSelect}
          >
            <option value="">Select your education level</option>
            {educationLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* Certifications */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Certifications (Optional)
          </label>
          <div className={styles.checkboxGroup}>
            {commonCertifications.map((cert) => (
              <div
                key={cert}
                className={`${styles.checkboxItem} ${certifications.includes(cert) ? styles.selected : ''}`}
                onClick={() => handleCertificationToggle(cert)}
              >
                <input
                  type="checkbox"
                  checked={certifications.includes(cert)}
                  onChange={() => {}}
                  className={styles.checkboxInput}
                />
                <label className={styles.checkboxLabel}>{cert}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            About You * (minimum 50 characters)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share your teaching philosophy, what makes you a great tutor, and what students can expect from your sessions..."
            className={styles.formTextarea}
            rows={5}
          />
          <p className={styles.progressIndicator}>
            {bio.length}/50 characters minimum
          </p>
        </div>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          {onBack && (
            <button
              onClick={onBack}
              className={styles.buttonSecondary}
              disabled={isLoading}
            >
              ← Back
            </button>
          )}
          <button
            onClick={onSkip}
            className={styles.buttonSecondary}
            disabled={isLoading}
          >
            Skip for now
          </button>
        </div>

        <div className={styles.actionRight}>
          <button
            onClick={handleNext}
            className={`${styles.buttonPrimary} ${!isValid ? styles.buttonDisabled : ''}`}
            disabled={!isValid || isLoading}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorQualificationsStep;
