/**
 * Filename: UnifiedSelect.tsx
 * Purpose: Unified single-select dropdown component with consistent chevron icon
 * Created: 2026-01-09
 *
 * Features:
 * - Native <select> element for performance and accessibility
 * - Consistent Lucide ChevronDown icon (matches HubToolbar)
 * - Error state styling
 * - Disabled state support
 * - Placeholder support
 *
 * Replaces: Select.tsx and Dropdown.tsx
 */

'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './form.module.css';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface UnifiedSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  value?: string | number;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
}

const UnifiedSelect = React.forwardRef<HTMLSelectElement, UnifiedSelectProps>(({
  options,
  value,
  onChange,
  placeholder,
  error = false,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  const baseStyles = 'w-full border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors bg-white';
  const normalStyles = 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
  const errorStyles = 'border-red-300 focus:border-red-500 focus:ring-red-500';
  const disabledStyles = 'bg-gray-50 cursor-not-allowed text-gray-500';

  return (
    <div className={styles.dropdownWrapper}>
      <select
        ref={ref}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`${styles.dropdownSelect} ${baseStyles} ${error ? errorStyles : normalStyles} ${disabled ? disabledStyles : ''} ${className}`}
        style={{
          paddingRight: '2.5rem', // Make room for chevron icon
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Chevron Icon */}
      <div
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: disabled ? '#9ca3af' : '#6b7280',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ChevronDown size={16} />
      </div>
    </div>
  );
});

UnifiedSelect.displayName = 'UnifiedSelect';

export default UnifiedSelect;
