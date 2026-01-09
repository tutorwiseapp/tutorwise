/**
 * Filename: UnifiedSelect.tsx
 * Purpose: Unified single-select dropdown component with consistent styling
 * Created: 2026-01-09
 * Updated: 2026-01-09 - Rebuilt with Radix UI for consistency with UnifiedMultiSelect
 *
 * Features:
 * - Radix UI dropdown menu for consistent styling
 * - Radix UI ChevronDownIcon (matches UnifiedMultiSelect)
 * - Error state styling
 * - Disabled state support
 * - Placeholder support
 * - Keyboard navigation
 *
 * Replaces: Select.tsx and Dropdown.tsx (native select version)
 */

'use client';

import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import styles from './FormControls.module.css';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface UnifiedSelectProps {
  options: SelectOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const UnifiedSelect = React.forwardRef<HTMLButtonElement, UnifiedSelectProps>(({
  options,
  value,
  onChange,
  placeholder,
  error = false,
  disabled = false,
  className = '',
  onBlur,
  onKeyDown,
}, ref) => {
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder || 'Select...';

  const handleSelect = (selectedValue: string) => {
    // Convert back to number if original value was number
    const option = options.find(opt => String(opt.value) === selectedValue);
    if (option) {
      onChange?.(option.value);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          ref={ref}
          className={`${styles.selectTrigger} ${error ? styles.selectTriggerError : ''} ${className}`}
          disabled={disabled}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          style={{
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <span className={!selectedOption ? styles.selectPlaceholder : ''}>
            {displayLabel}
          </span>
          <ChevronDownIcon className={styles.selectChevron} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.selectContent}
          sideOffset={5}
          align="start"
        >
          {options.map(option => (
            <DropdownMenu.Item
              key={option.value}
              className={`${styles.selectItem} ${value === option.value ? styles.selectItemSelected : ''}`}
              onSelect={() => handleSelect(String(option.value))}
            >
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});

UnifiedSelect.displayName = 'UnifiedSelect';

export default UnifiedSelect;
