/**
 * Filename: UnifiedMultiSelect.tsx
 * Purpose: Unified multi-select dropdown component with checkboxes
 * Created: 2026-01-09
 *
 * Features:
 * - Radix UI dropdown menu with checkbox items
 * - Consistent ChevronDown icon from Radix UI
 * - Multiple selection support
 * - Prevents menu close on selection
 * - Visual check indicators for selected items
 *
 * Replaces: MultiSelectDropdown.tsx
 */

'use client';

import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import styles from './FormControls.module.css';

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface UnifiedMultiSelectProps {
  triggerLabel: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (newValues: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

const UnifiedMultiSelect: React.FC<UnifiedMultiSelectProps> = ({
  triggerLabel,
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  disabled = false,
  className = '',
  error = false,
}) => {
  const handleSelect = (value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelection);
  };

  // Display trigger label with count if items are selected
  const displayLabel = selectedValues.length > 0
    ? `${triggerLabel} (${selectedValues.length})`
    : placeholder || triggerLabel;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`${styles.multiSelectTrigger} ${error ? styles.multiSelectTriggerError : ''} ${className}`}
          disabled={disabled}
          style={{
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {displayLabel}
          <ChevronDownIcon className={styles.multiSelectChevron} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.multiSelectContent}
          sideOffset={5}
          align="start"
        >
          {options.map(option => (
            <DropdownMenu.CheckboxItem
              key={option.value}
              className={styles.multiSelectCheckboxItem}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => handleSelect(option.value)}
              onSelect={(e) => e.preventDefault()} // Prevents menu from closing on click
            >
              {option.label}
            </DropdownMenu.CheckboxItem>
          ))}
          {selectedValues.length > 0 && (
            <>
              <DropdownMenu.Separator className={styles.multiSelectSeparator} />
              <DropdownMenu.Item
                className={styles.multiSelectClearButton}
                onSelect={(e) => {
                  e.preventDefault();
                  onSelectionChange([]);
                }}
              >
                Clear All
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default UnifiedMultiSelect;
