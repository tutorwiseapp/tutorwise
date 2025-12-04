/**
 * Filename: AccountHelpWidget.tsx
 * Purpose: Account Hub Help Widget
 * Created: 2025-12-03
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AccountHelpWidget.module.css';

export default function AccountHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Managing Your Account</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Keep your personal information up to date for accurate billing and communication.
        </p>
        <p className={styles.text}>
          Update your professional details to enhance your profile credibility.
        </p>
        <p className={styles.text}>
          Configure notification preferences to stay informed about important updates.
        </p>
      </div>
    </HubComplexCard>
  );
}
