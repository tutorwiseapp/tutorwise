/*
 * Filename: src/app/components/layout/Container.tsx
 * Purpose: Provides a responsive, variant-driven content container for all pages.
 *
 * Change History:
 * C003 - 2025-07-21 : 21:30 - Renamed 'auth' variant to the more generic 'form' variant.
 * C002 - 2025-07-21 : 21:15 - Added new 'auth' variant for narrow forms.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-21 : 21:30
 * Requirement ID (optional): VIN-UI-015
 *
 * Change Summary:
 * The component now accepts a new variant, `'form'`, which applies a `480px` max-width. This
 * is the new standard for all authentication and simple form pages, centralizing layout
 * logic and improving design consistency.
 *
 * Impact Analysis:
 * This is an additive change that makes the component more powerful and versatile.
 *
 * Dependencies: "react", "./Container.module.css".
 */
import React from 'react';
import styles from './Container.module.css';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  // --- FIX: Add 'form' to the list of official variants ---
  variant?: 'default' | 'narrow' | 'wide' | 'form' | 'profile'; 
}

const Container = ({ children, className, variant = 'default' }: ContainerProps) => {
  // This logic now correctly handles the new 'form' variant
  const containerClasses = [
    styles.container,
    styles[variant], // This will dynamically apply styles.default, styles.narrow, styles.form, etc.
    className,
  ].filter(Boolean).join(' ');

  return <div className={containerClasses}>{children}</div>;
};

export default Container;