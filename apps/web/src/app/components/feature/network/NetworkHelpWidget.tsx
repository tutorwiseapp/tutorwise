/**
 * Filename: NetworkHelpWidget.tsx
 * Purpose: Network Hub Help Widget - explains how the network system works
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about network features
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './NetworkHelpWidget.module.css';

export default function NetworkHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Network Works</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Connect with other tutors and educational professionals.
        </p>
        <p className={styles.text}>
          Build your professional network.
        </p>
        <p className={styles.text}>
          Collaborate and share opportunities.
        </p>
      </div>
    </HubComplexCard>
  );
}
