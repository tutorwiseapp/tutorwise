'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons, useWizardValidation } from '../shared/WizardButton';
import { SingleSelectCardGroup } from '../shared/SelectableCard';

interface AgentDetailsStepProps {
  onNext: (details: AgencyDetailsData) => void;
  onBack?: () => void;
  onSkip?: () => void;
  isLoading: boolean;
}

export interface AgencyDetailsData {
  agencyName: string;
  agencySize: string;
  yearsInBusiness: string;
  description: string;
}

const agencySizes = [
  { value: 'solo', label: 'Solo Referrer', description: 'Just me, referring clients' },
  { value: 'small', label: 'Small Network', description: '1-9 tutors I work with' },
  { value: 'medium', label: 'Medium Network', description: '10-100 tutors' },
  { value: 'large', label: 'Large Network', description: '100+ tutors' }
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

  // Validation using shared hook
  const { isValid } = useWizardValidation({
    fields: { agencyName, agencySize, yearsInBusiness, description },
    validators: {
      agencyName: (v) => v !== '',
      agencySize: (v) => v !== '',
      yearsInBusiness: (v) => v !== '',
      description: (v) => v.length >= 50,
    },
    debug: true,
  });

  const handleContinue = () => {
    // The WizardActionButtons component ensures this only runs when isValid is true
    onNext({ agencyName, agencySize, yearsInBusiness, description });
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Tell us about your agency
        </h2>
        <p className={styles.stepSubtitle}>
          Agent Onboarding • Help clients understand what makes your agency special
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
          <SingleSelectCardGroup
            options={agencySizes}
            selectedValue={agencySize}
            onChange={(value) => setAgencySize(value as string)}
            debug={true}
          />
        </div>

        {/* Years in Business */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Years in Business *
          </label>
          <SingleSelectCardGroup
            options={yearsOptions}
            selectedValue={yearsInBusiness}
            onChange={(value) => setYearsInBusiness(value as string)}
            debug={true}
          />
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            About Your Agency * (minimum 50 characters)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share your agency's mission, values, what makes you different, and what clients can expect..."
            className={styles.formTextarea}
            rows={5}
          />
          <p className={styles.progressIndicator}>
            {description.length}/50 characters minimum
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

export default AgentDetailsStep;
