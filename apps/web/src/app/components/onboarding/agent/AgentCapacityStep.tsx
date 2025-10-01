'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

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
  { value: 'local', label: 'Local In-Person', icon: '🏠' },
  { value: 'regional', label: 'Regional', icon: '🗺️' },
  { value: 'online', label: 'Online/Virtual', icon: '💻' },
  { value: 'hybrid', label: 'Hybrid Model', icon: '🔄' }
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

  const handleServiceAreaToggle = (value: string) => {
    setServiceAreas(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleNext = () => {
    if (commissionRate > 0 && serviceAreas.length > 0 && studentCapacity) {
      onNext({ commissionRate, serviceAreas, studentCapacity });
    }
  };

  const isValid = commissionRate > 0 && serviceAreas.length > 0 && studentCapacity;

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
          <div className={styles.roleGrid}>
            {commissionRates.map((rate) => (
              <div
                key={rate.value}
                className={`${styles.roleCard} ${commissionRate === rate.value ? styles.selected : ''}`}
                onClick={() => setCommissionRate(rate.value)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.roleHeader}>
                  <h3 className={styles.roleTitle}>{rate.label}</h3>
                  <div className={`${styles.roleCheckbox} ${commissionRate === rate.value ? styles.checked : ''}`}>
                    {commissionRate === rate.value && '✓'}
                  </div>
                </div>
                <p className={styles.roleDescription}>{rate.description}</p>
              </div>
            ))}
          </div>
          <p className={styles.progressIndicator}>
            💡 You can adjust your rate anytime in settings
          </p>
        </div>

        {/* Service Areas */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Service Areas * (Select all that apply)
          </label>
          <div className={styles.checkboxGroup}>
            {serviceAreaOptions.map((area) => (
              <div
                key={area.value}
                className={`${styles.checkboxItem} ${serviceAreas.includes(area.value) ? styles.selected : ''}`}
                onClick={() => handleServiceAreaToggle(area.value)}
              >
                <span style={{ marginRight: '8px' }}>{area.icon}</span>
                <label className={styles.checkboxLabel}>{area.label}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Student Capacity */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Current Student Capacity *
          </label>
          <div className={styles.roleGrid}>
            {capacityOptions.map((option) => (
              <div
                key={option.value}
                className={`${styles.roleCard} ${studentCapacity === option.value ? styles.selected : ''}`}
                onClick={() => setStudentCapacity(option.value)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.roleHeader}>
                  <h3 className={styles.roleTitle}>{option.label}</h3>
                  <div className={`${styles.roleCheckbox} ${studentCapacity === option.value ? styles.checked : ''}`}>
                    {studentCapacity === option.value && '✓'}
                  </div>
                </div>
                <p className={styles.roleDescription}>{option.description}</p>
              </div>
            ))}
          </div>
        </div>

        <p className={styles.progressIndicator}>
          {isValid ? '✓ All set! Ready to continue' : 'Please complete all required fields'}
        </p>
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

export default AgentCapacityStep;
