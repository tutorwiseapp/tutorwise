/**
 * Filename: src/app/components/feature/onboarding/shared/WizardButton.tsx
 * Purpose: Reusable button components for wizard flows with consistent behavior and styling
 *
 * Features:
 * - Automatic event handling (preventDefault, stopPropagation)
 * - Built-in loading state support
 * - Consistent styling across all wizards
 * - Debugging console logs (optional)
 * - Type-safe props
 */

'use client';

import React from 'react';
import styles from '../OnboardingWizard.module.css';

export interface WizardButtonProps {
  /** Button label/text */
  children: React.ReactNode;
  /** Click handler - automatically gets event handling */
  onClick: () => void;
  /** Button variant - primary (filled) or secondary (outlined) */
  variant?: 'primary' | 'secondary';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows disabled state) */
  isLoading?: boolean;
  /** Optional CSS class name override */
  className?: string;
  /** Enable debug logging for this button */
  debug?: boolean;
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Aria label for accessibility */
  ariaLabel?: string;
}

/**
 * Primary wizard button - used for main actions (Continue, Submit, Next)
 */
export const WizardPrimaryButton: React.FC<WizardButtonProps> = ({
  children,
  onClick,
  disabled = false,
  isLoading = false,
  className,
  debug = false,
  type = 'button',
  ariaLabel,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (debug) {
      console.log('[WizardPrimaryButton] Clicked:', { disabled, isLoading });
    }

    if (!disabled && !isLoading) {
      onClick();
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={handleClick}
      className={`${styles.buttonPrimary} ${isDisabled ? styles.buttonDisabled : ''} ${className || ''}`}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={isLoading}
    >
      {children}
    </button>
  );
};

/**
 * Secondary wizard button - used for secondary actions (Back, Skip, Cancel)
 */
export const WizardSecondaryButton: React.FC<WizardButtonProps> = ({
  children,
  onClick,
  disabled = false,
  isLoading = false,
  className,
  debug = false,
  type = 'button',
  ariaLabel,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (debug) {
      console.log('[WizardSecondaryButton] Clicked:', { disabled, isLoading });
    }

    if (!disabled && !isLoading) {
      onClick();
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={handleClick}
      className={`${styles.buttonSecondary} ${isDisabled ? styles.buttonDisabled : ''} ${className || ''}`}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={isLoading}
    >
      {children}
    </button>
  );
};

/**
 * Wizard action button group - manages Back, Skip, and Continue buttons with consistent layout
 */
export interface WizardActionButtonsProps {
  /** Continue button click handler */
  onContinue: () => void;
  /** Continue button enabled state */
  continueEnabled: boolean;
  /** Continue button label (default: "Continue →") */
  continueLabel?: string;
  /** Back button click handler (if provided, button shows) */
  onBack?: () => void;
  /** Back button label (default: "← Back") */
  backLabel?: string;
  /** Skip button click handler (if provided, button shows) */
  onSkip?: () => void;
  /** Skip button label (default: "Skip for now") */
  skipLabel?: string;
  /** Loading state (disables all buttons) */
  isLoading?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Complete action button group with Back, Skip, and Continue buttons
 * Handles layout and consistent styling
 */
export const WizardActionButtons: React.FC<WizardActionButtonsProps> = ({
  onContinue,
  continueEnabled,
  continueLabel = 'Continue →',
  onBack,
  backLabel = '← Back',
  onSkip,
  skipLabel = 'Skip for now',
  isLoading = false,
  debug = false,
}) => {
  return (
    <div className={styles.stepActions}>
      <div className={styles.actionLeft}>
        {onBack && (
          <WizardSecondaryButton
            onClick={onBack}
            disabled={isLoading}
            debug={debug}
            ariaLabel="Go back to previous step"
          >
            {backLabel}
          </WizardSecondaryButton>
        )}
        {onSkip && (
          <WizardSecondaryButton
            onClick={onSkip}
            disabled={isLoading}
            debug={debug}
            ariaLabel="Skip this step"
          >
            {skipLabel}
          </WizardSecondaryButton>
        )}
      </div>

      <div className={styles.actionRight}>
        <WizardPrimaryButton
          onClick={onContinue}
          disabled={!continueEnabled}
          isLoading={isLoading}
          debug={debug}
          ariaLabel="Continue to next step"
        >
          {continueLabel}
        </WizardPrimaryButton>
      </div>
    </div>
  );
};

/**
 * Hook for managing wizard step validation and button state
 *
 * Usage:
 * const { isValid, validate } = useWizardValidation({
 *   fields: { name, email, phone },
 *   validators: {
 *     name: (v) => v.length > 0,
 *     email: (v) => v.includes('@'),
 *     phone: (v) => v.length >= 10
 *   }
 * });
 */
export function useWizardValidation<T extends Record<string, any>>(config: {
  fields: T;
  validators: { [K in keyof T]?: (value: T[K]) => boolean };
  debug?: boolean;
}) {
  const { fields, validators, debug = false } = config;

  const validate = (): boolean => {
    const results: Record<string, boolean> = {};

    for (const key in validators) {
      const validator = validators[key];
      if (validator) {
        results[key] = validator(fields[key]);
      }
    }

    const isValid = Object.values(results).every(Boolean);

    if (debug) {
      console.log('[useWizardValidation]', {
        fields,
        results,
        isValid,
      });
    }

    return isValid;
  };

  const isValid = validate();

  return {
    isValid,
    validate,
  };
}

export default {
  Primary: WizardPrimaryButton,
  Secondary: WizardSecondaryButton,
  ActionButtons: WizardActionButtons,
  useValidation: useWizardValidation,
};
