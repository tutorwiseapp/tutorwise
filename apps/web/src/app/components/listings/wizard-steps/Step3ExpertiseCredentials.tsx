'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import styles from '../../onboarding/OnboardingWizard.module.css';

interface Step3Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

const SPECIALIZATIONS = [
  'Exam Preparation',
  'Homework Help',
  'ADHD Support',
  'Dyslexia Support',
  'Special Educational Needs (SEN)',
  'Gifted & Talented',
  'English as Second Language (ESL)',
  'Oxbridge Preparation',
  'Entrance Exams (11+, 13+)',
  'Adult Learning',
  'Career Changers',
  'Online Teaching',
  'Other'
];

const TEACHING_METHODS = [
  'Interactive Learning',
  'Visual Learning',
  'Hands-on Practice',
  'Exam-Focused',
  'Project-Based',
  'Discussion-Based',
  'One-on-One Attention',
  'Structured Lessons',
  'Flexible Approach',
  'Technology-Enhanced',
  'Games & Activities',
  'Real-World Examples',
  'Other'
];

const YEARS_EXPERIENCE = [
  '0-1',
  '1-3',
  '3-5',
  '5-10',
  '10+',
];

export default function Step3ExpertiseCredentials({ formData, onNext, onBack }: Step3Props) {
  const [specializations, setSpecializations] = useState<string[]>(formData.specializations || []);
  const [teachingMethods, setTeachingMethods] = useState<string[]>(formData.teaching_methods || []);
  const [yearsOfExperience, setYearsOfExperience] = useState(formData.years_of_experience || '');
  const [otherSpecialization, setOtherSpecialization] = useState('');
  const [otherMethod, setOtherMethod] = useState('');

  const toggleSpecialization = (item: string) => {
    setSpecializations(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleMethod = (item: string) => {
    setTeachingMethods(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleContinue = () => {
    // Replace "Other" with custom values if provided
    const finalSpecializations = specializations.map(s =>
      s === 'Other' && otherSpecialization.trim() ? otherSpecialization.trim() : s
    );
    const finalMethods = teachingMethods.map(m =>
      m === 'Other' && otherMethod.trim() ? otherMethod.trim() : m
    );

    onNext({
      specializations: finalSpecializations,
      teaching_methods: finalMethods,
      years_of_experience: yearsOfExperience,
    });
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>Your Expertise</h1>
        <p className={styles.stepSubtitle}>
          Highlight your specializations and teaching approach
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Years of Experience */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Years of Teaching Experience
          </label>
          <div className={styles.checkboxGroup}>
            {YEARS_EXPERIENCE.map((years) => (
              <button
                key={years}
                type="button"
                className={`${styles.checkboxItem} ${yearsOfExperience === years ? styles.selected : ''}`}
                onClick={() => setYearsOfExperience(years)}
              >
                {years} years
              </button>
            ))}
          </div>
        </div>

        {/* Specializations */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Specializations (Optional)
          </label>
          <div className={styles.checkboxGroup}>
            {SPECIALIZATIONS.map((spec) => (
              <button
                key={spec}
                type="button"
                className={`${styles.checkboxItem} ${specializations.includes(spec) ? styles.selected : ''}`}
                onClick={() => toggleSpecialization(spec)}
              >
                {spec}
              </button>
            ))}
          </div>
          {specializations.includes('Other') && (
            <div style={{ marginTop: '16px' }}>
              <input
                type="text"
                value={otherSpecialization}
                onChange={(e) => setOtherSpecialization(e.target.value)}
                placeholder="Please specify your specialization"
                maxLength={32}
                className={styles.formInput}
              />
            </div>
          )}
        </div>

        {/* Teaching Methods */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Teaching Methods (Optional)
          </label>
          <div className={styles.checkboxGroup}>
            {TEACHING_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                className={`${styles.checkboxItem} ${teachingMethods.includes(method) ? styles.selected : ''}`}
                onClick={() => toggleMethod(method)}
              >
                {method}
              </button>
            ))}
          </div>
          {teachingMethods.includes('Other') && (
            <div style={{ marginTop: '16px' }}>
              <input
                type="text"
                value={otherMethod}
                onChange={(e) => setOtherMethod(e.target.value)}
                placeholder="Please specify your teaching method"
                maxLength={32}
                className={styles.formInput}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          <button onClick={onBack} className={styles.buttonSecondary}>
            Back
          </button>
        </div>
        <div className={styles.actionRight}>
          <button onClick={handleContinue} className={styles.buttonPrimary}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
