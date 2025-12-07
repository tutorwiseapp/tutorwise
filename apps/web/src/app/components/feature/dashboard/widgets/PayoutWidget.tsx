/**
 * Filename: PayoutWidget.tsx
 * Purpose: Actionable widget showing next payout information
 * Created: 2025-12-07
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Wallet, Calendar } from 'lucide-react';
import styles from './PayoutWidget.module.css';

interface PayoutWidgetProps {
  nextPayoutDate?: string;
  nextPayoutAmount?: number;
  pendingBalance?: number;
  currency?: string;
}

export default function PayoutWidget({
  nextPayoutDate,
  nextPayoutAmount = 0,
  pendingBalance = 0,
  currency = 'GBP'
}: PayoutWidgetProps) {

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getDaysUntilPayout = (dateString?: string) => {
    if (!dateString) return null;
    const payoutDate = new Date(dateString);
    const today = new Date();
    const diffTime = payoutDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilPayout(nextPayoutDate);
  const hasUpcomingPayout = nextPayoutDate && nextPayoutAmount > 0;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Wallet className={styles.icon} size={20} />
          <h3 className={styles.title}>Next Payout</h3>
        </div>
        {daysUntil !== null && daysUntil >= 0 && (
          <span className={styles.badge}>{daysUntil}d</span>
        )}
      </div>

      <div className={styles.content}>
        {hasUpcomingPayout ? (
          <>
            <div className={styles.payoutAmount}>
              <span className={styles.amountLabel}>Amount</span>
              <span className={styles.amountValue}>
                {formatCurrency(nextPayoutAmount)}
              </span>
            </div>

            <div className={styles.payoutDate}>
              <Calendar size={16} className={styles.dateIcon} />
              <span className={styles.dateText}>
                {formatDate(nextPayoutDate)}
              </span>
            </div>

            {pendingBalance > 0 && (
              <div className={styles.pendingBalance}>
                <span className={styles.pendingLabel}>Pending Balance:</span>
                <span className={styles.pendingValue}>
                  {formatCurrency(pendingBalance)}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              No upcoming payouts scheduled. Complete sessions to earn payouts.
            </p>
          </div>
        )}

        <Link href="/payments" className={styles.actionButton}>
          View Payment History
        </Link>
      </div>
    </div>
  );
}
