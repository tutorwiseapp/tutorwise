/*
 * Filename: src/app/components/ui/form/FormGroup.tsx
 * Purpose: A reusable wrapper for form elements, providing a label and consistent spacing.
 *
 * Change History:
 * C003 - 2025-07-21 : 20:30 - Added 'compact' prop to conditionally apply different margins.
 * C002 - 2025-07-21 : 19:15 - Added optional 'footnote' prop for helper text.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-21 : 20:30
 * Requirement ID (optional): VIN-UI-012
 *
 * Change Summary:
 * The component now accepts an optional boolean `compact` prop. When true, it applies a
 * `.compactMarginBottom` class, reducing its bottom margin. This allows for optical spacing
 * adjustments directly on the component, which is the correct architectural approach.
 *
 * Impact Analysis:
 * This makes the component more flexible and powerful, enabling pixel-perfect form layouts.
 *
 * Dependencies: "react", "./form.module.css".
 * Props: { label: string, htmlFor?: string, children: React.ReactNode, footnote?: string, compact?: boolean }
 */
import React from 'react';
import styles from './form.module.css';

interface FormGroupProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  footnote?: string;
  compact?: boolean;
}

const FormGroup = ({ label, htmlFor, children, footnote, compact = false }: FormGroupProps) => {
  // Conditionally build the className string to include the compact style if needed
  const groupClasses = [
    styles.formGroup,
    compact ? styles.compactMarginBottom : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={groupClasses}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
      {children}
      {footnote && <p className={styles.footnote}>{footnote}</p>}
    </div>
  );
};

export default FormGroup;