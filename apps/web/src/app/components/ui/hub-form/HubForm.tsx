/**
 * Filename: HubForm.tsx
 * Purpose: Standardized form layout for hub pages (Organisation, Profile, etc.)
 * Created: 2025-11-20
 * Design: Matches PersonalInfoForm visual style
 *
 * Compound Components:
 * - HubForm.Root: Form wrapper with white bg, shadow, border
 * - HubForm.Grid: 2-column responsive grid layout
 * - HubForm.Field: Label + Input + Error wrapper
 * - HubForm.Actions: Bottom action bar for Save/Cancel buttons
 */

'use client';

import React from 'react';
import styles from './HubForm.module.css';

interface HubFormRootProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

function HubFormRoot({ children, onSubmit, className }: HubFormRootProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={`${styles.root} ${className || ''}`}
    >
      {children}
    </form>
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
}

function HubFormField({ label, required, error, children, className }: HubFormFieldProps) {
  return (
    <div className={`${styles.field} ${className || ''}`}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {children}
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
