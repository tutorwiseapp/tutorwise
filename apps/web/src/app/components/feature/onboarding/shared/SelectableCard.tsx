/**
 * Filename: src/app/components/feature/onboarding/shared/SelectableCard.tsx
 * Purpose: Reusable selectable card components for wizard forms
 *
 * Features:
 * - Single-select and multi-select variants
 * - Consistent styling and behavior
 * - Automatic event handling
 * - Keyboard accessibility
 * - Grid layout support
 */

'use client';

import React from 'react';
import styles from '../OnboardingWizard.module.css';

export interface SelectableCardOption {
  /** Unique value identifier */
  value: string | number;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Optional icon/emoji */
  icon?: string;
}

export interface SingleSelectCardProps {
  /** Available options */
  options: SelectableCardOption[];
  /** Currently selected value */
  selectedValue: string | number | null;
  /** Selection change handler */
  onChange: (value: string | number) => void;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Single-select card group (radio button behavior)
 * Used for: hourly rate selection, role selection, etc.
 */
export const SingleSelectCardGroup: React.FC<SingleSelectCardProps> = ({
  options,
  selectedValue,
  onChange,
  debug = false,
  className,
}) => {
  const handleSelect = (value: string | number) => {
    if (debug) {
      console.log('[SingleSelectCardGroup] Selected:', value);
    }
    onChange(value);
  };

  return (
    <div className={`${styles.roleGrid} ${className || ''}`}>
      {options.map((option) => {
        const isSelected = selectedValue === option.value;

        return (
          <div
            key={option.value}
            className={`${styles.roleCard} ${isSelected ? styles.selected : ''}`}
            onClick={() => handleSelect(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(option.value);
              }
            }}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.roleHeader}>
              <h3 className={styles.roleTitle}>
                {option.icon && <span style={{ marginRight: '8px' }}>{option.icon}</span>}
                {option.label}
              </h3>
              <div className={`${styles.roleCheckbox} ${isSelected ? styles.checked : ''}`}>
                {isSelected && '✓'}
              </div>
            </div>
            {option.description && (
              <p className={styles.roleDescription}>{option.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export interface MultiSelectCardProps {
  /** Available options */
  options: SelectableCardOption[];
  /** Currently selected values */
  selectedValues: (string | number)[];
  /** Selection change handler */
  onChange: (values: (string | number)[]) => void;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Multi-select card group (checkbox behavior)
 * Used for: availability slots, session types, subjects, etc.
 */
export const MultiSelectCardGroup: React.FC<MultiSelectCardProps> = ({
  options,
  selectedValues,
  onChange,
  debug = false,
  className,
}) => {
  const handleToggle = (value: string | number) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    if (debug) {
      console.log('[MultiSelectCardGroup] Toggled:', value, '→ New values:', newValues);
    }

    onChange(newValues);
  };

  return (
    <div className={`${styles.roleGrid} ${className || ''}`}>
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);

        return (
          <div
            key={option.value}
            className={`${styles.roleCard} ${isSelected ? styles.selected : ''}`}
            onClick={() => handleToggle(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle(option.value);
              }
            }}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.roleHeader}>
              <h3 className={styles.roleTitle}>
                {option.icon && <span style={{ marginRight: '8px' }}>{option.icon}</span>}
                {option.label}
              </h3>
              <div className={`${styles.roleCheckbox} ${isSelected ? styles.checked : ''}`}>
                {isSelected && '✓'}
              </div>
            </div>
            {option.description && (
              <p className={styles.roleDescription}>{option.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export interface CompactCheckboxOption {
  /** Unique value identifier */
  value: string | number;
  /** Display label */
  label: string;
  /** Optional icon/emoji */
  icon?: string;
}

export interface CompactCheckboxGroupProps {
  /** Available options */
  options: CompactCheckboxOption[];
  /** Currently selected values */
  selectedValues: (string | number)[];
  /** Selection change handler */
  onChange: (values: (string | number)[]) => void;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Compact checkbox group (smaller, grid-based)
 * Used for: session types, teaching methods, etc.
 */
export const CompactCheckboxGroup: React.FC<CompactCheckboxGroupProps> = ({
  options,
  selectedValues,
  onChange,
  debug = false,
  className,
}) => {
  const handleToggle = (value: string | number) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    if (debug) {
      console.log('[CompactCheckboxGroup] Toggled:', value, '→ New values:', newValues);
    }

    onChange(newValues);
  };

  return (
    <div className={`${styles.checkboxGroup} ${className || ''}`}>
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);

        return (
          <div
            key={option.value}
            className={`${styles.checkboxItem} ${isSelected ? styles.selected : ''}`}
            onClick={() => handleToggle(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle(option.value);
              }
            }}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
            style={{ cursor: 'pointer' }}
          >
            {option.icon && <span style={{ marginRight: '8px' }}>{option.icon}</span>}
            <span>{option.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default {
  SingleSelect: SingleSelectCardGroup,
  MultiSelect: MultiSelectCardGroup,
  CompactCheckbox: CompactCheckboxGroup,
};
