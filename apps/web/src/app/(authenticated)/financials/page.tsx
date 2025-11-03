/*
 * Filename: src/app/(authenticated)/financials/page.tsx
 * Purpose: Financials hub page - displays transaction history (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-03 - Refactored to use URL query parameters for filters (SDD v3.6 compliance)
 * Specification: SDD v3.6, Section 4.2 - /financials hub, Section 2.0 - Server-side filtering via URL params
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import TransactionCard from '@/app/components/financials/TransactionCard';
import ContextualSidebar, { BalanceSummaryWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import { Transaction, TransactionType, TransactionStatus } from '@/types';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

export default function FinancialsPage() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read filters from URL (SDD v3.6: URL is single source of truth)
  const typeFilter = (searchParams?.get('type') as TransactionType | null) || 'all';
  const statusFilter = (searchParams?.get('status') as TransactionStatus | null) || 'all';

  // Update URL when filter changes
  const handleFilterChange = (filterType: 'type' | 'status', value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value === 'all') {
      params.delete(filterType);
    } else {
      params.set(filterType, value);
    }
    router.push(`/financials${params.toString() ? `?${params.toString()}` : ''}`);
  };

  useEffect(() => {
    if (!profile) return;

    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Fetch ALL transactions (no filter params - client-side filtering)
        const response = await fetch(`/api/financials`);

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
  }, [profile]); // Only re-fetch when profile changes, not on filter change

  // Client-side filtering based on URL params
  const filteredTransactions = transactions.filter((txn) => {
    const typeMatch = typeFilter === 'all' || txn.type === typeFilter;
    const statusMatch = statusFilter === 'all' || txn.status === statusFilter;
    return typeMatch && statusMatch;
  });

  // Calculate balance summary (from ALL transactions, not filtered)
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

        {/* Status Filter Tabs - Using URL params */}
        <div className={styles.filterTabs}>
          <button
            onClick={() => handleFilterChange('status', 'all')}
            className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
          >
            All Status
          </button>
          <button
            onClick={() => handleFilterChange('status', 'Pending')}
            className={`${styles.filterTab} ${statusFilter === 'Pending' ? styles.filterTabActive : ''}`}
          >
            Pending
          </button>
          <button
            onClick={() => handleFilterChange('status', 'Paid')}
            className={`${styles.filterTab} ${statusFilter === 'Paid' ? styles.filterTabActive : ''}`}
          >
            Paid
          </button>
          <button
            onClick={() => handleFilterChange('status', 'Failed')}
            className={`${styles.filterTab} ${statusFilter === 'Failed' ? styles.filterTabActive : ''}`}
          >
            Failed
          </button>
          <button
            onClick={() => handleFilterChange('status', 'Cancelled')}
            className={`${styles.filterTab} ${statusFilter === 'Cancelled' ? styles.filterTabActive : ''}`}
          >
            Cancelled
          </button>
        </div>

        {/* Transaction Type Filter - Dropdown for 5 types */}
        <div className={styles.typeFilterSection}>
          <label className={styles.typeFilterLabel}>Transaction Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className={styles.typeFilterSelect}
          >
            <option value="all">All Types</option>
            <option value="Booking Payment">Booking Payment</option>
            <option value="Tutoring Payout">Tutoring Payout</option>
            <option value="Referral Commission">Referral Commission</option>
            <option value="Agent Commission">Agent Commission</option>
            <option value="Platform Fee">Platform Fee</option>
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!error && filteredTransactions.length === 0 && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No transactions found</h3>
            <p className={styles.emptyText}>
              {transactions.length === 0
                ? 'Your transaction history will appear here once you start earning or making payments.'
                : 'No transactions match your current filters.'}
            </p>
          </div>
        )}

        {/* Transactions List */}
        {!error && filteredTransactions.length > 0 && (
          <div className={styles.transactionsList}>
            {filteredTransactions.map((transaction) => (
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
