/*
 * Filename: src/app/components/ui/form/FormSection.tsx
 * Purpose: Reusable section wrapper for form cards with title and description
 * Created: 2025-11-04
 * v4.0: Part of dynamic multi-service listing form architecture
 */

import React from 'react';
import styles from './FormSection.module.css';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormSection provides consistent structure for form sections within cards
 *
 * Usage:
 * <Card>
 *   <FormSection title="Core Details" description="Main service information">
 *     <FormGroup>...</FormGroup>
 *   </FormSection>
 * </Card>
 */
export default function FormSection({
  title,
  description,
  children,
  className
}: FormSectionProps) {
  return (
    <div className={`${styles.formSection} ${className || ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {description && (
          <p className={styles.description}>{description}</p>
        )}
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
