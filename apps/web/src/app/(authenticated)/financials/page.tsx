/*
 * Filename: src/app/(authenticated)/financials/page.tsx
 * Purpose: Transactions tab - displays transaction history with v4.9 status filtering
 * Created: 2025-11-02
 * Updated: 2025-11-13 - Migrated to React Query for robustness and consistency
 * Specification: SDD v4.9 - Transactions page with clearing/available/paid_out/disputed/refunded statuses
 */
'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getFinancials } from '@/lib/api/financials';
import TransactionCard from '@/app/components/financials/TransactionCard';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import WalletBalanceWidget from '@/app/components/financials/WalletBalanceWidget';
import styles from './page.module.css';

// v4.9 Transaction statuses
type TransactionStatusV49 = 'clearing' | 'available' | 'paid_out' | 'disputed' | 'refunded' | 'all';

export default function TransactionsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter from URL
  const statusFilter = (searchParams?.get('status') as TransactionStatusV49) || 'all';

  // React Query: Fetch financials data
  const {
    data: financialsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['financials', profile?.id],
    queryFn: getFinancials,
    enabled: !!profile && !profileLoading,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });

  const transactions = financialsData?.transactions ?? [];
  const balances = financialsData?.balances ?? { available: 0, pending: 0, total: 0 };

  // Client-side filtering based on URL param
  const filteredTransactions = useMemo(() => {
    if (statusFilter === 'all') return transactions;
    return transactions.filter((txn) => txn.status === statusFilter);
  }, [transactions, statusFilter]);

  // Update URL when filter changes
  const handleFilterChange = (newStatus: TransactionStatusV49) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus === 'all') {
      params.delete('status');
    } else {
      params.set('status', newStatus);
    }
    router.push(`/financials${params.toString() ? `?${params.toString()}` : ''}`);
  };

  if (profileLoading || isLoading) {
    return (
      <>
        <div className={styles.loading}>Loading transactions...</div>
        <ContextualSidebar>
          <div className={styles.skeletonWidget} />
        </ContextualSidebar>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className={styles.error}>
          <p>Failed to load financial data. Please try again.</p>
        </div>
        <ContextualSidebar>
          <WalletBalanceWidget
            available={0}
            pending={0}
            total={0}
          />
        </ContextualSidebar>
      </>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>Track your earnings and transaction history</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          onClick={() => handleFilterChange('all')}
          className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
        >
          All Status
        </button>
        <button
          onClick={() => handleFilterChange('clearing')}
          className={`${styles.filterTab} ${statusFilter === 'clearing' ? styles.filterTabActive : ''}`}
        >
          Clearing
        </button>
        <button
          onClick={() => handleFilterChange('available')}
          className={`${styles.filterTab} ${statusFilter === 'available' ? styles.filterTabActive : ''}`}
        >
          Available
        </button>
        <button
          onClick={() => handleFilterChange('paid_out')}
          className={`${styles.filterTab} ${statusFilter === 'paid_out' ? styles.filterTabActive : ''}`}
        >
          Paid Out
        </button>
        <button
          onClick={() => handleFilterChange('disputed')}
          className={`${styles.filterTab} ${statusFilter === 'disputed' ? styles.filterTabActive : ''}`}
        >
          Disputed
        </button>
        <button
          onClick={() => handleFilterChange('refunded')}
          className={`${styles.filterTab} ${statusFilter === 'refunded' ? styles.filterTabActive : ''}`}
        >
          Refunded
        </button>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Empty State */}
        {filteredTransactions.length === 0 && (
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
        {filteredTransactions.length > 0 && (
          <div className={styles.transactionsList}>
            {filteredTransactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </div>

      {/* Contextual Sidebar (Right Column) */}
      <ContextualSidebar>
        <WalletBalanceWidget
          available={balances.available}
          pending={balances.pending}
          total={balances.total}
        />
      </ContextualSidebar>
    </>
  );
}
