'use client';

import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import styles from './FormControls.module.css'; // We'll add styles to our shared file

type Option = {
  value: string;
  label: string;
};

interface MultiSelectDropdownProps {
  triggerLabel: string;
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (newValues: string[]) => void;
}

const MultiSelectDropdown = ({
  triggerLabel,
  options,
  selectedValues,
  onSelectionChange,
}: MultiSelectDropdownProps) => {

  const handleSelect = (value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelection);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={styles.multiSelectTrigger}>
          {triggerLabel}
          <ChevronDownIcon className={styles.multiSelectChevron} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.multiSelectContent} sideOffset={5}>
          {options.map(option => (
            <DropdownMenu.CheckboxItem
              key={option.value}
              className={styles.multiSelectCheckboxItem}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => handleSelect(option.value)}
              onSelect={(e) => e.preventDefault()} // Prevents menu from closing on click
            >
              <DropdownMenu.ItemIndicator className={styles.multiSelectItemIndicator}>
                <CheckIcon />
              </DropdownMenu.ItemIndicator>
              {option.label}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default MultiSelectDropdown;