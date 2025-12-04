/**
 * Filename: PayoutHelpWidget.tsx
 * Purpose: Payouts Hub Help Widget - explains how withdrawals work
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about withdrawal process
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './PayoutHelpWidget.module.css';

export default function PayoutHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Withdrawals Work</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Funds are available 7 days after service completion.
        </p>
        <p className={styles.text}>
          Withdrawals are processed within 2-3 business days.
        </p>
        <p className={styles.text}>
          Funds are sent to your registered bank account.
        </p>
      </div>
    </HubComplexCard>
  );
}
