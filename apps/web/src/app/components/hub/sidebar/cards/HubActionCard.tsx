/**
 * Filename: HubActionCard.tsx
 * Purpose: Core Action Card Shell - Simple CTA pattern
 * Created: 2025-11-18
 * Updated: 2025-11-19 - Added teal header for v2 design consistency
 * Design: context-sidebar-ui-design-v2.md Section 2.1
 *
 * Pattern B: Action Card Pattern
 * - Teal header with title
 * - Description + Button in content area
 * - NO ICONS (professional aesthetic)
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './HubActionCard.module.css';

interface SidebarActionWidgetProps {
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
  buttonVariant?: 'primary' | 'secondary';
  className?: string;
}

export default function HubActionCard({
  title,
  description,
  buttonText,
  onButtonClick,
  buttonVariant = 'primary',
  className = '',
}: SidebarActionWidgetProps) {
  return (
    <HubComplexCard className={className}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>
        <p className={styles.description}>{description}</p>
        <button
          onClick={onButtonClick}
          className={`${styles.button} ${styles[buttonVariant]}`}
        >
          {buttonText}
        </button>
      </div>
    </HubComplexCard>
  );
}
