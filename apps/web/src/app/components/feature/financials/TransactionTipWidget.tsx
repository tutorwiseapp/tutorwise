/**
 * Filename: TransactionTipWidget.tsx
 * Purpose: Transactions Hub Tip Widget
 * Created: 2025-12-17
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './TransactionTipWidget.module.css';

export default function TransactionTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Transaction Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Regularly review your transaction history to track earnings and identify any discrepancies.
        </p>
      </div>
    </HubComplexCard>
  );
}
