'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

interface AgentDetailsStepProps {
  onNext: (details: AgencyDetailsData) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

export interface AgencyDetailsData {
  agencyName: string;
  agencySize: string;
  yearsInBusiness: string;
  description: string;
}

const agencySizes = [
  { value: 'solo', label: 'Solo Agent', description: 'Just me' },
  { value: 'small', label: 'Small Team', description: '2-5 tutors' },
  { value: 'medium', label: 'Growing Agency', description: '6-20 tutors' },
  { value: 'large', label: 'Established Agency', description: '20+ tutors' }
];

const yearsOptions = [
  { value: 'startup', label: 'Just starting', description: '0-1 years' },
  { value: 'early', label: 'Early stage', description: '1-3 years' },
  { value: 'established', label: 'Established', description: '3-5 years' },
  { value: 'mature', label: 'Mature business', description: '5+ years' }
];

const AgentDetailsStep: React.FC<AgentDetailsStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading
}) => {
  const [agencyName, setAgencyName] = useState('');
  const [agencySize, setAgencySize] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [description, setDescription] = useState('');

  const handleNext = () => {
    if (agencyName && agencySize && yearsInBusiness && description.length >= 50) {
      onNext({ agencyName, agencySize, yearsInBusiness, description });
    }
  };

  const isValid = agencyName && agencySize && yearsInBusiness && description.length >= 50;

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Tell us about your agency
        </h2>
        <p className={styles.stepSubtitle}>
          Help clients understand what makes your agency special
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Agency Name */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Agency Name *
          </label>
          <input
            type="text"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="Enter your agency name"
            className={styles.formInput}
          />
        </div>

        {/* Agency Size */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Agency Size *
          </label>
          <div className={styles.roleGrid}>
            {agencySizes.map((size) => (
              <div
                key={size.value}
                className={`${styles.roleCard} ${agencySize === size.value ? styles.selected : ''}`}
                onClick={() => setAgencySize(size.value)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.roleHeader}>
                  <h3 className={styles.roleTitle}>{size.label}</h3>
                  <div className={`${styles.roleCheckbox} ${agencySize === size.value ? styles.checked : ''}`}>
                    {agencySize === size.value && '✓'}
                  </div>
                </div>
                <p className={styles.roleDescription}>{size.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Years in Business */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Years in Business *
          </label>
          <div className={styles.roleGrid}>
            {yearsOptions.map((option) => (
              <div
                key={option.value}
                className={`${styles.roleCard} ${yearsInBusiness === option.value ? styles.selected : ''}`}
                onClick={() => setYearsInBusiness(option.value)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.roleHeader}>
                  <h3 className={styles.roleTitle}>{option.label}</h3>
                  <div className={`${styles.roleCheckbox} ${yearsInBusiness === option.value ? styles.checked : ''}`}>
                    {yearsInBusiness === option.value && '✓'}
                  </div>
                </div>
                <p className={styles.roleDescription}>{option.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            About Your Agency * (minimum 50 characters)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share your agency&apos;s mission, values, what makes you different, and what clients can expect..."
            className={styles.formTextarea}
            rows={5}
          />
          <p className={styles.progressIndicator}>
            {description.length}/50 characters minimum
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

export default AgentDetailsStep;
