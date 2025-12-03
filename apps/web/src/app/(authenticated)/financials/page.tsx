/*
 * Filename: src/app/(authenticated)/financials/page.tsx
 * Purpose: Transactions tab - displays transaction history with v4.9 status filtering
 * Created: 2025-11-02
 * Updated: 2025-11-29 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs, HubPagination
 * Specification: SDD v4.9 - Transactions page with clearing/available/paid_out/disputed/refunded statuses
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getFinancials } from '@/lib/api/financials';
import TransactionCard from '@/app/components/feature/financials/TransactionCard';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import WalletBalanceWidget from '@/app/components/feature/financials/WalletBalanceWidget';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

// v4.9 Transaction statuses
type TransactionStatusV49 = 'clearing' | 'available' | 'paid_out' | 'disputed' | 'refunded' | 'all';
type DateRangeType = 'all' | '7days' | '30days' | '3months' | '6months' | '1year';
type TransactionType = 'all' | 'income' | 'expense';

const ITEMS_PER_PAGE = 5;

export default function TransactionsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter from URL
  const statusFilter = (searchParams?.get('status') as TransactionStatusV49) || 'all';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Client-side filtering
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    let filtered = [...transactions];

    // Status tab filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter((txn) => txn.status === statusFilter);
    }

    // Search filtering (by description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((txn) => {
        const description = txn.description?.toLowerCase() || '';
        return description.includes(query);
      });
    }

    // Date range filtering
    if (dateRange !== 'all') {
      const cutoffDate = new Date();
      switch (dateRange) {
        case '7days':
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case '30days':
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          break;
        case '3months':
          cutoffDate.setMonth(cutoffDate.getMonth() - 3);
          break;
        case '6months':
          cutoffDate.setMonth(cutoffDate.getMonth() - 6);
          break;
        case '1year':
          cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
          break;
      }
      filtered = filtered.filter((txn) => new Date(txn.created_at) >= cutoffDate);
    }

    // Transaction type filtering (income vs expense)
    if (transactionType !== 'all') {
      filtered = filtered.filter((txn) => {
        const amount = txn.amount || 0;
        if (transactionType === 'income') return amount > 0;
        if (transactionType === 'expense') return amount < 0;
        return true;
      });
    }

    return filtered;
  }, [transactions, statusFilter, searchQuery, dateRange, transactionType]);

  // Pagination
  const totalItems = filteredTransactions.length;
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, dateRange, transactionType]);

  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'all') {
      params.delete('status');
    } else {
      params.set('status', tabId);
    }
    router.push(`/financials${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Stats for tabs
  const stats = useMemo(() => {
    if (!transactions) return { all: 0, clearing: 0, available: 0, paid_out: 0, disputed: 0, refunded: 0 };
    return {
      all: transactions.length,
      clearing: transactions.filter(t => t.status === 'clearing').length,
      available: transactions.filter(t => t.status === 'available').length,
      paid_out: transactions.filter(t => t.status === 'paid_out').length,
      disputed: transactions.filter(t => t.status === 'disputed').length,
      refunded: transactions.filter(t => t.status === 'refunded').length,
    };
  }, [transactions]);

  // Action handlers
  const handleRequestWithdrawal = () => {
    toast('Withdrawal request functionality coming soon!', { icon: '💰' });
    setShowActionsMenu(false);
  };

  const handleViewStripeDashboard = () => {
    window.open('https://dashboard.stripe.com', '_blank');
    setShowActionsMenu(false);
  };

  const handleExportCSV = () => {
    if (!filteredTransactions.length) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['Date', 'Description', 'Amount', 'Status'];
    const rows = filteredTransactions.map(txn => [
      new Date(txn.created_at).toLocaleDateString('en-GB'),
      txn.description || '',
      `£${(txn.amount / 100).toFixed(2)}`,
      txn.status || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Transactions exported successfully');
    setShowActionsMenu(false);
  };

  // Loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Transactions" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.loading}>Loading transactions...</div>
        </div>
      </HubPageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Transactions" />}
        sidebar={
          <HubSidebar>
            <WalletBalanceWidget
              available={0}
              pending={0}
              total={0}
            />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.error}>
            <p>Failed to load financial data. Please try again.</p>
          </div>
        </div>
      </HubPageLayout>
    );
  }

  // Main render
  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Transactions"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search by description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />

              {/* Date Range Dropdown */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeType)}
                className={filterStyles.filterSelect}
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>

              {/* Type Dropdown */}
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className={filterStyles.filterSelect}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          }
          actions={
            <>
              {/* Primary Action Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestWithdrawal}
              >
                Request Withdrawal
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={handleViewStripeDashboard}
                        className={actionStyles.menuButton}
                      >
                        View Stripe Dashboard
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className={actionStyles.menuButton}
                      >
                        Export CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Status', count: stats.all, active: statusFilter === 'all' },
            { id: 'clearing', label: 'Clearing', count: stats.clearing, active: statusFilter === 'clearing' },
            { id: 'available', label: 'Available', count: stats.available, active: statusFilter === 'available' },
            { id: 'paid_out', label: 'Paid Out', count: stats.paid_out, active: statusFilter === 'paid_out' },
            { id: 'disputed', label: 'Disputed', count: stats.disputed, active: statusFilter === 'disputed' },
            { id: 'refunded', label: 'Refunded', count: stats.refunded, active: statusFilter === 'refunded' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <WalletBalanceWidget
            available={balances.available}
            pending={balances.pending}
            total={balances.total}
          />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {/* Empty State */}
        {paginatedTransactions.length === 0 ? (
          <div className={styles.emptyState}>
            {transactions.length === 0 ? (
              <>
                <h3 className={styles.emptyTitle}>No transactions yet</h3>
                <p className={styles.emptyText}>
                  Your transaction history will appear here once you start earning or making payments.
                </p>
              </>
            ) : (
              <>
                <h3 className={styles.emptyTitle}>No transactions found</h3>
                <p className={styles.emptyText}>
                  No transactions match your current filters. Try adjusting your search or filters.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Transactions List */}
            <div className={styles.transactionsList}>
              {paginatedTransactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  currentUserId={profile?.id || ''}
                />
              ))}
            </div>

            {/* Pagination */}
            {filteredTransactions.length > ITEMS_PER_PAGE && (
              <HubPagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </HubPageLayout>
  );
}
