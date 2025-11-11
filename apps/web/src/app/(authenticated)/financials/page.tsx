/*
 * Filename: src/app/(authenticated)/financials/page.tsx
 * Purpose: Transactions tab - displays transaction history with v4.9 status filtering
 * Created: 2025-11-02
 * Updated: 2025-11-11 - v4.9: Refactored for secondary tab navigation and new transaction statuses
 * Specification: SDD v4.9 - Transactions page with clearing/available/paid_out/disputed/refunded statuses
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import TransactionCard from '@/app/components/financials/TransactionCard';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import WalletBalanceWidget from '@/app/components/financials/WalletBalanceWidget';
import { Transaction } from '@/types';
import styles from './page.module.css';

// v4.9 Transaction statuses
type TransactionStatusV49 = 'clearing' | 'available' | 'paid_out' | 'disputed' | 'refunded' | 'all';

export default function TransactionsPage() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState({
    available: 0,
    pending: 0,
    total: 0,
  });

  // Read filter from URL
  const statusFilter = (searchParams?.get('status') as TransactionStatusV49) || 'all';

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

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch transactions and balances from API
        const response = await fetch(`/api/financials`);

        if (!response.ok) {
          throw new Error('Failed to fetch financial data');
        }

        const data = await response.json();
        setTransactions(data.transactions || []);
        setBalances(data.balances || { available: 0, pending: 0, total: 0 });
      } catch (err) {
        console.error('Error fetching financial data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  // Client-side filtering based on URL param
  const filteredTransactions = transactions.filter((txn) => {
    if (statusFilter === 'all') return true;
    return txn.status === statusFilter;
  });

  if (isLoading) {
    return (
      <>
        <div className={styles.loading}>Loading transactions...</div>
        <ContextualSidebar>
          <div className={styles.skeletonWidget} />
        </ContextualSidebar>
      </>
    );
  }

  return (
    <>
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
        <WalletBalanceWidget
          available={balances.available}
          pending={balances.pending}
          total={balances.total}
        />
      </ContextualSidebar>
    </>
  );
}
