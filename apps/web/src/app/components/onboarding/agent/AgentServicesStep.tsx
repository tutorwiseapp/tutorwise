'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';

interface AgentServicesStepProps {
  onNext: (services: string[]) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

const services = [
  {
    id: 'academic_tutoring',
    label: 'Academic Tutoring',
    description: 'K-12 and college subject tutoring',
    outcome: 'Provide: Comprehensive academic support',
    popular: true
  },
  {
    id: 'test_prep',
    label: 'Test Preparation',
    description: 'SAT, ACT, GRE, GMAT prep',
    outcome: 'Provide: Standardized test coaching',
    popular: true
  },
  {
    id: 'language_learning',
    label: 'Language Learning',
    description: 'ESL, foreign languages, linguistics',
    outcome: 'Provide: Language instruction services',
    popular: true
  },
  {
    id: 'stem_tutoring',
    label: 'STEM Tutoring',
    description: 'Math, Science, Programming, Engineering',
    outcome: 'Provide: Technical subject expertise'
  },
  {
    id: 'special_needs',
    label: 'Special Needs',
    description: 'Learning disabilities, IEP support',
    outcome: 'Provide: Specialized education support'
  },
  {
    id: 'college_prep',
    label: 'College Preparation',
    description: 'Essay writing, application support, college counseling',
    outcome: 'Provide: College admissions guidance'
  },
  {
    id: 'career_coaching',
    label: 'Career Coaching',
    description: 'Resume building, interview prep, career planning',
    outcome: 'Provide: Professional development services'
  },
  {
    id: 'enrichment',
    label: 'Enrichment Programs',
    description: 'Music, arts, sports, hobby instruction',
    outcome: 'Provide: Extracurricular education'
  }
];

const AgentServicesStep: React.FC<AgentServicesStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleNext = () => {
    if (selectedServices.length > 0) {
      onNext(selectedServices);
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          What services does your agency provide?
        </h2>
        <p className={styles.stepSubtitle}>
          Select all services your agency offers. You can always add more later.
        </p>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.roleGrid}>
          {services.map((service) => (
            <div
              key={service.id}
              className={`${styles.roleCard} ${selectedServices.includes(service.id) ? styles.selected : ''} ${service.popular ? styles.popular : ''}`}
              onClick={() => handleServiceToggle(service.id)}
            >
              {service.popular && <span className={styles.popularBadge}>Popular</span>}

              <div className={styles.roleHeader}>
                <h3 className={styles.roleTitle}>{service.label}</h3>
                <div className={`${styles.roleCheckbox} ${selectedServices.includes(service.id) ? styles.checked : ''}`}>
                  {selectedServices.includes(service.id) && '✓'}
                </div>
              </div>

              <p className={styles.roleDescription}>{service.description}</p>

              <div className={styles.outcomeBox}>
                <span className={styles.outcomeText}>{service.outcome}</span>
              </div>
            </div>
          ))}
        </div>

        <p className={styles.progressIndicator}>
          {selectedServices.length === 0 ? 'Select at least one service' :
           `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`}
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
            className={styles.buttonPrimary}
            disabled={selectedServices.length === 0 || isLoading}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentServicesStep;
