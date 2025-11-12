/*
 * Filename: src/app/components/financials/PayoutActionsWidget.tsx
 * Purpose: Payout withdrawal actions widget for ContextualSidebar
 * Created: 2025-11-11
 * Specification: SDD v4.9 - Payout actions with withdrawal button
 */
'use client';

import React, { useState } from 'react';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import Button from '@/app/components/ui/Button';
import styles from './PayoutActionsWidget.module.css';

interface PayoutActionsWidgetProps {
  availableBalance: number;
}

export default function PayoutActionsWidget({ availableBalance }: PayoutActionsWidgetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleWithdraw = async () => {
    if (availableBalance <= 0) {
      setMessage({ type: 'error', text: 'No funds available to withdraw' });
      return;
    }

    try {
      setIsProcessing(true);
      setMessage(null);

      // Call the withdrawal API endpoint
      const response = await fetch('/api/financials/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: availableBalance }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Withdrawal failed');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: 'Withdrawal initiated successfully!' });

      // Reload page after 2 seconds to show updated balance
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Withdrawal error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to process withdrawal',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = availableBalance <= 0 || isProcessing;
  const minWithdrawal = 10; // Minimum withdrawal amount in GBP
  const canWithdraw = availableBalance >= minWithdrawal;

  return (
    <SidebarWidget title="Payout Actions">
      <div className={styles.actionsCard}>
        <div className={styles.balanceDisplay}>
          <span className={styles.balanceLabel}>Available to Withdraw</span>
          <span className={styles.balanceAmount}>£{availableBalance.toFixed(2)}</span>
        </div>

        <Button
          variant="primary"
          onClick={handleWithdraw}
          disabled={isDisabled || !canWithdraw}
          className={styles.withdrawButton}
        >
          {isProcessing ? 'Processing...' : 'Withdraw Funds'}
        </Button>

        {!canWithdraw && availableBalance > 0 && (
          <p className={styles.infoText}>
            Minimum withdrawal amount is £{minWithdrawal.toFixed(2)}
          </p>
        )}

        {availableBalance <= 0 && (
          <p className={styles.infoText}>
            No funds available for withdrawal
          </p>
        )}

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <div className={styles.helpSection}>
          <p className={styles.helpTitle}>How withdrawals work:</p>
          <ul className={styles.helpList}>
            <li>Funds are available 7 days after service completion</li>
            <li>Withdrawals are processed within 2-3 business days</li>
            <li>Funds are sent to your registered bank account</li>
          </ul>
        </div>
      </div>
    </SidebarWidget>
  );
}
