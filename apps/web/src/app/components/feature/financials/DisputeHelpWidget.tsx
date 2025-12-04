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
        <p className={styles.text}>
          File a dispute if you encounter issues with a transaction.
        </p>
        <p className={styles.text}>
          Provide evidence and details to support your claim.
        </p>
        <p className={styles.text}>
          Our support team will review and resolve disputes fairly.
        </p>
      </div>
    </HubComplexCard>
  );
}
