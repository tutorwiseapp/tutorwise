/*
 * Filename: src/app/components/financials/WalletBalanceWidget.tsx
 * Purpose: Display wallet balance summary for v4.9 (v2 design system)
 * Created: 2025-11-11
 * Updated: 2025-11-18 - Migrated to HubStatsCard (v2 design)
 * Specification: SDD v4.9 - Balance widget with clearing/available/total amounts
 */
'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './WalletBalanceWidget.module.css';

interface WalletBalanceWidgetProps {
  available: number;
  pending: number;
  total: number;
}

export default function WalletBalanceWidget({ available, pending, total }: WalletBalanceWidgetProps) {
  const stats: StatRow[] = [
    {
      label: 'Available',
      value: `£${available.toFixed(2)}`,
      valueColor: 'green',
    },
    {
      label: 'Clearing',
      value: `£${pending.toFixed(2)}`,
      valueColor: 'orange',
    },
    {
      label: 'Total Earned',
      value: `£${total.toFixed(2)}`,
      valueColor: 'default',
    },
  ];

  return (
    <>
      <HubStatsCard title="Wallet Balance" stats={stats} />

      {/* Info note widget */}
      <HubComplexCard>
        <div className={styles.balanceNote}>
          <p className={styles.noteText}>
            Funds become available 7 days after service completion
          </p>
        </div>
      </HubComplexCard>
    </>
  );
}
