/*
 * Filename: src/app/(authenticated)/financials/page.tsx
 * Purpose: Financials hub page - displays transaction history (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 4.2 - /financials hub
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import TransactionCard from '@/app/components/financials/TransactionCard';
import ContextualSidebar, { BalanceSummaryWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import { Transaction, TransactionType, TransactionStatus } from '@/types';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

export default function FinancialsPage() {
  const { profile } = useUserProfile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');

  useEffect(() => {
    if (!profile) return;

    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Build query params
        const params = new URLSearchParams();
        if (typeFilter !== 'all') params.append('type', typeFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);

        const response = await fetch(`/api/financials?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [profile, typeFilter, statusFilter]);

  // Calculate balance summary
  const balanceSummary = transactions.reduce(
    (acc, txn) => {
      // Only count income transactions (payouts and commissions)
      const isIncome =
        txn.type === 'Tutoring Payout' ||
        txn.type === 'Referral Commission' ||
        txn.type === 'Agent Commission';

      if (!isIncome) return acc;

      if (txn.status === 'Paid') {
        acc.available += txn.amount;
        acc.total += txn.amount;
      } else if (txn.status === 'Pending') {
        acc.pending += txn.amount;
        acc.total += txn.amount;
      }

      return acc;
    },
    { available: 0, pending: 0, total: 0 }
  );

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading transactions...</div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Financials</h1>
          <p className={styles.subtitle}>
            Track your earnings, commissions, and payment history
          </p>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Transaction Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
              className={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="Booking Payment">Booking Payment</option>
              <option value="Tutoring Payout">Tutoring Payout</option>
              <option value="Referral Commission">Referral Commission</option>
              <option value="Agent Commission">Agent Commission</option>
              <option value="Platform Fee">Platform Fee</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | 'all')}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Failed">Failed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!error && transactions.length === 0 && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No transactions found</h3>
            <p className={styles.emptyText}>
              Your transaction history will appear here once you start earning or making payments.
            </p>
          </div>
        )}

        {/* Transactions List */}
        {!error && transactions.length > 0 && (
          <div className={styles.transactionsList}>
            {transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </div>

      {/* Contextual Sidebar (Right Column) */}
      <ContextualSidebar>
        <BalanceSummaryWidget
          available={balanceSummary.available}
          pending={balanceSummary.pending}
          total={balanceSummary.total}
        />
      </ContextualSidebar>
    </>
  );
}
