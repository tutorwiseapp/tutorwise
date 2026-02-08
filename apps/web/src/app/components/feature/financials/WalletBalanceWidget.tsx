/*
 * Filename: src/app/components/financials/WalletBalanceWidget.tsx
 * Purpose: Display wallet balance summary for v4.9 (v2 design system)
 * Created: 2025-11-11
 * Updated: 2026-02-07 - Enhanced with earnings projections (Financials Audit Follow-up)
 * Specification: SDD v4.9 - Balance widget with clearing/available/total amounts + projections
 */
'use client';

import React, { useState, useMemo } from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';
import { Transaction } from '@/types';
import { Info } from 'lucide-react';
import styles from './WalletBalanceWidget.module.css';

interface WalletBalanceWidgetProps {
  available: number;
  pending: number;
  total: number;
  transactions?: Transaction[]; // Optional: for earnings projections
}

interface EarningsProjection {
  date: string;
  amount: number;
  transactionCount: number;
}

export default function WalletBalanceWidget({
  available,
  pending,
  total,
  transactions = []
}: WalletBalanceWidgetProps) {
  const [showProjections, setShowProjections] = useState(false);

  // Calculate earnings projections from clearing transactions
  const earningsProjections = useMemo((): EarningsProjection[] => {
    if (!transactions.length) return [];

    // Filter clearing transactions with future available_at dates
    const clearingTransactions = transactions.filter(
      (txn) => txn.status === 'clearing' && txn.available_at
    );

    // Group by available date
    const grouped = clearingTransactions.reduce((acc, txn) => {
      const date = new Date(txn.available_at!).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (!acc[date]) {
        acc[date] = { date, amount: 0, transactionCount: 0 };
      }

      acc[date].amount += txn.amount;
      acc[date].transactionCount += 1;

      return acc;
    }, {} as Record<string, EarningsProjection>);

    // Convert to array and sort by date (earliest first)
    return Object.values(grouped).sort((a, b) => {
      const dateA = new Date(a.date.split(' ').reverse().join(' '));
      const dateB = new Date(b.date.split(' ').reverse().join(' '));
      return dateA.getTime() - dateB.getTime();
    }).slice(0, 5); // Show max 5 upcoming dates
  }, [transactions]);

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
    <div className={styles.widgetContainer}>
      <HubStatsCard title="Wallet Balance" stats={stats} />

      {/* Earnings Projections Section */}
      {earningsProjections.length > 0 && (
        <div className={styles.projectionsSection}>
          <button
            className={styles.projectionsToggle}
            onClick={() => setShowProjections(!showProjections)}
          >
            <Info size={14} />
            <span>Upcoming Earnings</span>
            <span className={styles.toggleIcon}>{showProjections ? '−' : '+'}</span>
          </button>

          {showProjections && (
            <div className={styles.projectionsList}>
              {earningsProjections.map((projection, index) => (
                <div key={index} className={styles.projectionItem}>
                  <span className={styles.projectionDate}>{projection.date}</span>
                  <span className={styles.projectionAmount}>
                    £{projection.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className={styles.projectionFooter}>
                Funds become available 7 days after session completion
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
