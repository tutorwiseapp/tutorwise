'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons, useWizardValidation } from '../shared/WizardButton';
import { SingleSelectCardGroup, MultiSelectCardGroup } from '../shared/SelectableCard';

interface AgentCapacityStepProps {
  onNext: (capacity: CapacityData) => void;
  onBack?: () => void;
  isLoading: boolean;
}

export interface CapacityData {
  commissionRate: number;
  serviceAreas: string[];
}

const commissionRates = [
  { value: 10, label: '10%', description: 'Low commission' },
  { value: 15, label: '15%', description: 'Standard' },
  { value: 20, label: '20%', description: 'Premium service' },
  { value: 25, label: '25%', description: 'Full-service' },
  { value: 30, label: '30%+', description: 'Concierge' }
];

const serviceAreaOptions = [
  { value: 'local', label: 'Local', description: 'Within your city/area' },
  { value: 'regional', label: 'Regional', description: 'Within your region/country' },
  { value: 'international', label: 'International', description: 'Worldwide' }
];

const AgentCapacityStep: React.FC<AgentCapacityStepProps> = ({
  onNext,
  onBack,
  isLoading
}) => {
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  // Validation using shared hook
  const { isValid } = useWizardValidation({
    fields: { commissionRate, serviceAreas },
    validators: {
      commissionRate: (v) => v > 0,
      serviceAreas: (v) => v.length > 0,
    },
    debug: true,
  });

  const handleContinue = () => {
    // The WizardActionButtons component ensures this only runs when isValid is true
    onNext({ commissionRate, serviceAreas });
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Set your commission and service areas
        </h2>
        <p className={styles.stepSubtitle}>
          Agent Onboarding • Define your commission rates and geographic reach
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Commission Rate */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Commission Rate *
          </label>
          <SingleSelectCardGroup
            options={commissionRates}
            selectedValue={commissionRate}
            onChange={(value) => setCommissionRate(value as number)}
            debug={true}
          />
        </div>

        {/* Service Areas */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Service Areas * (Select all that apply)
          </label>
          <MultiSelectCardGroup
            options={serviceAreaOptions}
            selectedValues={serviceAreas}
            onChange={(values) => setServiceAreas(values as string[])}
            debug={true}
          />
        </div>

        <p className={styles.progressIndicator}>
          {isValid ? '✓ All set! Ready to continue' : 'Please complete all required fields'}
        </p>
      </div>

      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={isValid}
        onBack={onBack}
        isLoading={isLoading}
        debug={true}
      />
    </div>
  );
};

export default AgentCapacityStep;
