/*
 * Filename: src/app/components/financials/WalletBalanceWidget.tsx
 * Purpose: Display wallet balance summary for v4.9 (ContextualSidebar widget)
 * Created: 2025-11-11
 * Specification: SDD v4.9 - Balance widget with clearing/available/total amounts
 */
'use client';

import React from 'react';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import styles from './WalletBalanceWidget.module.css';

interface WalletBalanceWidgetProps {
  available: number;
  pending: number;
  total: number;
}

export default function WalletBalanceWidget({ available, pending, total }: WalletBalanceWidgetProps) {
  return (
    <SidebarWidget title="Wallet Balance">
      <div className={styles.balanceCard}>
        <div className={styles.balanceRow}>
          <span className={styles.balanceLabel}>Available:</span>
          <span className={styles.balanceAvailable}>£{available.toFixed(2)}</span>
        </div>
        <div className={styles.balanceRow}>
          <span className={styles.balanceLabel}>Clearing:</span>
          <span className={styles.balancePending}>£{pending.toFixed(2)}</span>
        </div>
        <div className={`${styles.balanceRow} ${styles.balanceTotal}`}>
          <span className={styles.balanceLabel}>Total Earned:</span>
          <span className={styles.balanceAmountTotal}>£{total.toFixed(2)}</span>
        </div>
        <div className={styles.balanceNote}>
          <p className={styles.noteText}>
            Funds become available 7 days after service completion
          </p>
        </div>
      </div>
    </SidebarWidget>
  );
}
