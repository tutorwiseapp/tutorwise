'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons, useWizardValidation } from '../shared/WizardButton';
import { SingleSelectCardGroup, MultiSelectCardGroup } from '../shared/SelectableCard';

interface AgentCapacityStepProps {
  onNext: (capacity: CapacityData) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

export interface CapacityData {
  commissionRate: number;
  serviceAreas: string[];
  studentCapacity: string;
}

const commissionRates = [
  { value: 10, label: '10%', description: 'Low commission' },
  { value: 15, label: '15%', description: 'Standard' },
  { value: 20, label: '20%', description: 'Premium service' },
  { value: 25, label: '25%', description: 'Full-service' },
  { value: 30, label: '30%+', description: 'Concierge' }
];

const serviceAreaOptions = [
  { value: 'local', label: 'Local In-Person' },
  { value: 'regional', label: 'Regional' },
  { value: 'online', label: 'Online/Virtual' },
  { value: 'hybrid', label: 'Hybrid Model' }
];

const capacityOptions = [
  { value: 'small', label: '1-25 students', description: 'Boutique service' },
  { value: 'medium', label: '25-100 students', description: 'Growing capacity' },
  { value: 'large', label: '100-500 students', description: 'Large operation' },
  { value: 'enterprise', label: '500+ students', description: 'Enterprise scale' }
];

const AgentCapacityStep: React.FC<AgentCapacityStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading
}) => {
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [studentCapacity, setStudentCapacity] = useState('');

  // Validation using shared hook
  const { isValid } = useWizardValidation({
    fields: { commissionRate, serviceAreas, studentCapacity },
    validators: {
      commissionRate: (v) => v > 0,
      serviceAreas: (v) => v.length > 0,
      studentCapacity: (v) => v !== '',
    },
    debug: true,
  });

  const handleContinue = () => {
    // The WizardActionButtons component ensures this only runs when isValid is true
    onNext({ commissionRate, serviceAreas, studentCapacity });
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Set your capacity and pricing
        </h2>
        <p className={styles.stepSubtitle}>
          Let clients know your service model and pricing structure
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
          <p className={styles.progressIndicator}>
            💡 You can adjust your rate anytime in settings
          </p>
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

        {/* Student Capacity */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Current Student Capacity *
          </label>
          <SingleSelectCardGroup
            options={capacityOptions}
            selectedValue={studentCapacity}
            onChange={(value) => setStudentCapacity(value as string)}
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
        onSkip={onSkip}
        isLoading={isLoading}
        debug={true}
      />
    </div>
  );
};

export default AgentCapacityStep;
