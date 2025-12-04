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
        <ul className={styles.list}>
          <li className={styles.listItem}>
            Connect with other tutors and educational professionals
          </li>
          <li className={styles.listItem}>
            Build your professional network
          </li>
          <li className={styles.listItem}>
            Collaborate and share opportunities
          </li>
        </ul>
      </div>
    </HubComplexCard>
  );
}
