'use client';

import styles from './OnboardingProgressBar.module.css';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface OnboardingProgressBarProps {
  steps: Step[];
  currentStepId: string;
  completedStepIds: string[];
}

export default function OnboardingProgressBar({
  steps,
  currentStepId,
  completedStepIds,
}: OnboardingProgressBarProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  const getStepStatus = (stepId: string, index: number): 'completed' | 'current' | 'upcoming' => {
    if (completedStepIds.includes(stepId)) return 'completed';
    if (stepId === currentStepId) return 'current';
    if (index < currentStepIndex) return 'completed';
    return 'upcoming';
  };

  return (
    <div className={styles.container}>
      {/* Progress Bar */}
      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className={styles.stepsContainer}>
        {steps.map((step, index) => {
          const status = getStepStatus(step.id, index);
          const isLastStep = index === steps.length - 1;

          return (
            <div key={step.id} className={styles.stepWrapper}>
              <div className={styles.stepIndicator}>
                <div className={`${styles.stepCircle} ${styles[`stepCircle--${status}`]}`}>
                  {status === 'completed' ? (
                    <svg className={styles.checkIcon} fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className={styles.stepNumber}>{index + 1}</span>
                  )}
                </div>

                {!isLastStep && (
                  <div
                    className={`${styles.stepConnector} ${
                      status === 'completed' ? styles['stepConnector--completed'] : ''
                    }`}
                  />
                )}
              </div>

              <div className={styles.stepLabel}>
                <div className={`${styles.stepTitle} ${styles[`stepTitle--${status}`]}`}>
                  {step.label}
                </div>
                {step.description && status === 'current' && (
                  <div className={styles.stepDescription}>{step.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Text */}
      <div className={styles.progressText}>
        Step {currentStepIndex + 1} of {steps.length}
      </div>
    </div>
  );
}
