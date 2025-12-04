/**
 * Filename: apps/web/src/app/components/feature/financials/BalanceSummaryWidget.tsx
 * Purpose: Display balance summary in sidebar
 * Created: 2025-12-04 (Moved from HubSidebar.tsx - Priority 2: Architecture cleanup)
 * Architecture: Feature-specific widget (Tier 3) - belongs in feature/financials
 */

'use client';

import React from 'react';
import styles from './BalanceSummaryWidget.module.css';

interface BalanceSummaryWidgetProps {
  available: number;
  pending: number;
  total: number;
}

export default function BalanceSummaryWidget({
  available,
  pending,
  total
}: BalanceSummaryWidgetProps) {
  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>Balance Summary</h3>
      <div className={styles.widgetContent}>
        <div className={styles.balanceCard}>
          <div className={styles.balanceRow}>
            <span className={styles.balanceLabel}>Available:</span>
            <span className={styles.balanceAmount}>£{available.toFixed(2)}</span>
          </div>
          <div className={styles.balanceRow}>
            <span className={styles.balanceLabel}>Pending:</span>
            <span className={styles.balancePending}>£{pending.toFixed(2)}</span>
          </div>
          <div className={`${styles.balanceRow} ${styles.balanceTotal}`}>
            <span className={styles.balanceLabel}>Total:</span>
            <span className={styles.balanceAmountTotal}>£{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
