'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons, useWizardValidation } from '../shared/WizardButton';
import { SingleSelectCardGroup, MultiSelectCardGroup } from '../shared/SelectableCard';

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
  { value: 'high_school', label: 'High School', description: 'Secondary education', icon: '🎓' },
  { value: 'some_college', label: 'Some College', description: 'Partial post-secondary', icon: '📚' },
  { value: 'bachelors', label: "Bachelor's Degree", description: 'Undergraduate degree', icon: '🎓' },
  { value: 'masters', label: "Master's Degree", description: 'Graduate degree', icon: '🎓' },
  { value: 'phd', label: 'Ph.D. or Doctorate', description: 'Doctoral degree', icon: '👨‍🎓' }
];

const commonCertifications = [
  { value: 'teaching_certificate', label: 'Teaching Certificate', description: 'State or national certification', icon: '📜' },
  { value: 'tesol_tefl', label: 'TESOL/TEFL', description: 'English language teaching', icon: '🌍' },
  { value: 'subject_specific', label: 'Subject-Specific Certification', description: 'Specialized subject area', icon: '📋' },
  { value: 'tutoring_cert', label: 'Tutoring Certification', description: 'Professional tutoring credential', icon: '✅' },
  { value: 'none', label: 'None yet', description: 'No certifications at this time', icon: '○' }
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

  // Validation using shared hook
  const { isValid } = useWizardValidation({
    fields: { experience, education, bio },
    validators: {
      experience: (v) => v !== '',
      education: (v) => v !== '',
      bio: (v) => v.length >= 50,
    },
    debug: true,
  });

  const handleContinue = () => {
    // The WizardActionButtons component ensures this only runs when isValid is true
    onNext({ experience, education, certifications, bio });
  };

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
          <SingleSelectCardGroup
            options={experienceLevels}
            selectedValue={experience}
            onChange={(value) => setExperience(value as string)}
            debug={true}
          />
        </div>

        {/* Education */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Highest Education Level *
          </label>
          <SingleSelectCardGroup
            options={educationLevels}
            selectedValue={education}
            onChange={(value) => setEducation(value as string)}
            debug={true}
          />
        </div>

        {/* Certifications */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Certifications (Select all that apply)
          </label>
          <MultiSelectCardGroup
            options={commonCertifications}
            selectedValues={certifications}
            onChange={(values) => setCertifications(values as string[])}
            debug={true}
          />
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

      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={isValid}
        onBack={onBack}
        onSkip={onSkip}
        isLoading={isLoading}
        debug={true}
      />
    </div>
  );
};

export default TutorQualificationsStep;
