/**
 * Filename: PayoutTipWidget.tsx
 * Purpose: Payouts Hub Tip Widget - provides helpful tips for managing withdrawals
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content
 * - Teal header
 * - Tip content
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './PayoutTipWidget.module.css';

export default function PayoutTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Payout Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Request withdrawals regularly to maintain healthy cash flow for your tutoring business.
        </p>
      </div>
    </HubComplexCard>
  );
}
