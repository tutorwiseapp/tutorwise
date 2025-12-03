/**
 * Filename: /app/components/hub/form/HubForm.tsx
 * Purpose: Gold Standard form layout for hub pages (Organisation, Profile, etc.)
 * Version: v3 (Borderless, Auto-save)
 * Created: 2025-11-20
 * Design: Clean/Borderless look with hybrid auto-save + manual safety buttons
 *
 * Compound Components:
 * - HubForm.Root: Transparent container (no box, no shadow)
 * - HubForm.Section: Optional section grouping with title
 * - HubForm.Grid: 2-column responsive grid layout (24px gap)
 * - HubForm.Field: Label + Input/Display + Error wrapper (supports "Click to Edit")
 * - HubForm.Actions: Bottom action bar for Save/Cancel safety buttons
 */

'use client';

import React from 'react';
import styles from './HubForm.module.css';

interface HubFormRootProps {
  children: React.ReactNode;
  className?: string;
}

function HubFormRoot({ children, className }: HubFormRootProps) {
  return (
    <div className={`${styles.root} ${className || ''}`}>
      {children}
    </div>
  );
}

interface HubFormSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

function HubFormSection({ title, children, className }: HubFormSectionProps) {
  return (
    <div className={`${styles.section} ${className || ''}`}>
      {title && <h3 className={styles.sectionTitle}>{title}</h3>}
      {children}
    </div>
  );
}

interface HubFormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

function HubFormGrid({ children, columns = 2, className }: HubFormGridProps) {
  return (
    <div
      className={`${styles.grid} ${columns === 1 ? styles.gridSingle : ''} ${className || ''}`}
    >
      {children}
    </div>
  );
}

interface HubFormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  isEditing?: boolean;
  onClick?: () => void;
}

function HubFormField({
  label,
  required,
  error,
  children,
  className,
  isEditing,
  onClick
}: HubFormFieldProps) {
  return (
    <div className={`${styles.field} ${className || ''}`}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <div
        className={isEditing === false && onClick ? styles.clickableDisplay : undefined}
        onClick={isEditing === false && onClick ? onClick : undefined}
      >
        {children}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

interface HubFormActionsProps {
  children: React.ReactNode;
  className?: string;
}

function HubFormActions({ children, className }: HubFormActionsProps) {
  return (
    <div className={`${styles.actions} ${className || ''}`}>
      {children}
    </div>
  );
}

// Export compound component
export const HubForm = {
  Root: HubFormRoot,
  Section: HubFormSection,
  Grid: HubFormGrid,
  Field: HubFormField,
  Actions: HubFormActions,
};

export default HubForm;
