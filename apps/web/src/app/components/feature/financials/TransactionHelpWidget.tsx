/**
 * Filename: TransactionHelpWidget.tsx
 * Purpose: Transactions Hub Help Widget
 * Created: 2025-12-17
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './TransactionHelpWidget.module.css';

export default function TransactionHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Transactions Work</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Track all your income and expenses in one place.
        </p>
        <p className={styles.text}>
          View transaction status from clearing to paid out.
        </p>
        <p className={styles.text}>
          Export transactions for accounting and tax purposes.
        </p>
      </div>
    </HubComplexCard>
  );
}
