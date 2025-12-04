/**
 * Filename: DisputeHelpWidget.tsx
 * Purpose: Disputes Hub Help Widget - explains how dispute resolution works
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about dispute process
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DisputeHelpWidget.module.css';

export default function DisputeHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Disputes Work</h3>
      <div className={styles.content}>
        <ul className={styles.list}>
          <li className={styles.listItem}>
            File a dispute if you encounter issues with a transaction
          </li>
          <li className={styles.listItem}>
            Provide evidence and details to support your claim
          </li>
          <li className={styles.listItem}>
            Our support team will review and resolve disputes fairly
          </li>
        </ul>
      </div>
    </HubComplexCard>
  );
}
