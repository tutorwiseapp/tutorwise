/**
 * Filename: SidebarActionWidget.tsx
 * Purpose: Core Action Card Shell - Simple CTA pattern
 * Created: 2025-11-18
 * Design: context-sidebar-ui-design-v2.md Section 2.1
 *
 * Pattern B: Action Card Pattern
 * - Title -> Description -> Button stack
 * - Clear instruction + button flows
 * - NO ICONS (professional aesthetic)
 */

'use client';

import React from 'react';
import styles from './SidebarActionWidget.module.css';

interface SidebarActionWidgetProps {
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
  buttonVariant?: 'primary' | 'secondary';
  className?: string;
}

export default function SidebarActionWidget({
  title,
  description,
  buttonText,
  onButtonClick,
  buttonVariant = 'primary',
  className = '',
}: SidebarActionWidgetProps) {
  return (
    <div className={`${styles.actionWidget} ${className}`}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      <button
        onClick={onButtonClick}
        className={`${styles.button} ${styles[buttonVariant]}`}
      >
        {buttonText}
      </button>
    </div>
  );
}
