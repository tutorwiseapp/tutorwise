/*
 * Filename: src/app/(admin)/admin/financials/page.tsx
 * Purpose: Admin Transactions page - displays ALL platform transactions
 * Created: 2025-12-23
 * Pattern: Matches user financials/transactions page design exactly
 * Specification: Admin version with platform-wide data access
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Transaction statuses (matching user version)
type TransactionStatus = 'clearing' | 'available' | 'paid_out' | 'disputed' | 'refunded' | 'all';
type DateRangeType = 'all' | '7days' | '30days' | '3months' | '6months' | '1year';
type TransactionType = 'all' | 'income' | 'expense';

const ITEMS_PER_PAGE = 10;

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  type: string;
  description?: string;
  service_name?: string;
  subjects?: string[];
  tutor_name?: string;
  client_name?: string;
  agent_name?: string;
  location_type?: string;
  user_id?: string;
  user_email?: string;
}

export default function AdminFinancialsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter from URL
  const statusFilter = (searchParams?.get('status') as TransactionStatus) || 'all';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // TODO: Replace with real API call
  // React Query: Fetch ALL platform transactions
  const {
    data: transactionsData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['admin', 'financials', 'transactions'],
    queryFn: async () => {
      // TODO: Implement API endpoint /api/admin/financials
      // For now, return empty data
      return {
        transactions: [] as Transaction[],
        balances: {
          total_revenue: 0,
          total_commission: 0,
          pending_payouts: 0,
        },
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const transactions = useMemo(() => transactionsData?.transactions ?? [], [transactionsData?.transactions]);
  const balances = useMemo(
    () => transactionsData?.balances ?? { total_revenue: 0, total_commission: 0, pending_payouts: 0 },
    [transactionsData?.balances]
  );

  // Client-side filtering (matching user version)
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Status tab filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter((txn) => txn.status === statusFilter);
    }

    // Search filtering (comprehensive search across all relevant fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((txn) => {
        const description = txn.description?.toLowerCase() || '';
        const serviceName = txn.service_name?.toLowerCase() || '';
        const subjects = txn.subjects?.join(' ').toLowerCase() || '';
        const tutorName = txn.tutor_name?.toLowerCase() || '';
        const clientName = txn.client_name?.toLowerCase() || '';
        const agentName = txn.agent_name?.toLowerCase() || '';
        const locationType = txn.location_type?.toLowerCase() || '';
        const type = txn.type?.toLowerCase() || '';
        const status = txn.status?.toLowerCase() || '';
        const userEmail = txn.user_email?.toLowerCase() || '';

        return (
          description.includes(query) ||
          serviceName.includes(query) ||
          subjects.includes(query) ||
          tutorName.includes(query) ||
          clientName.includes(query) ||
          agentName.includes(query) ||
          locationType.includes(query) ||
          type.includes(query) ||
          status.includes(query) ||
          userEmail.includes(query)
        );
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
    router.push(`/admin/financials${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Stats for tabs
  const stats = useMemo(() => {
    if (!transactions) return { all: 0, clearing: 0, available: 0, paid_out: 0, disputed: 0, refunded: 0 };
    return {
      all: transactions.length,
      clearing: transactions.filter((t) => t.status === 'clearing').length,
      available: transactions.filter((t) => t.status === 'available').length,
      paid_out: transactions.filter((t) => t.status === 'paid_out').length,
      disputed: transactions.filter((t) => t.status === 'disputed').length,
      refunded: transactions.filter((t) => t.status === 'refunded').length,
    };
  }, [transactions]);

  // Action handlers
  const handleViewStripeDashboard = () => {
    window.open('https://dashboard.stripe.com', '_blank');
    setShowActionsMenu(false);
  };

  const handleExportCSV = () => {
    if (!filteredTransactions.length) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['Date', 'User', 'Description', 'Type', 'Amount', 'Status'];
    const rows = filteredTransactions.map((txn) => [
      new Date(txn.created_at).toLocaleDateString('en-GB'),
      txn.user_email || '',
      txn.description || '',
      txn.type || '',
      `£${((txn.amount || 0) / 100).toFixed(2)}`,
      txn.status || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `admin-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Transactions exported successfully');
    setShowActionsMenu(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Platform Transactions" />}
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
        header={<HubHeader title="Platform Transactions" />}
        sidebar={
          <HubSidebar>
            <AdminStatsWidget
              title="Platform Financials"
              stats={[
                { label: 'Total Revenue', value: '£0.00' },
                { label: 'Total Commission', value: '£0.00' },
                { label: 'Pending Payouts', value: '£0.00' },
              ]}
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
          title="Platform Transactions"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search transactions..."
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
              <Button variant="primary" size="sm" onClick={() => router.push('/admin/reports')}>
                View Reports
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button variant="secondary" size="sm" square onClick={() => setShowActionsMenu(!showActionsMenu)}>
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div className={actionStyles.backdrop} onClick={() => setShowActionsMenu(false)} />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu}>
                      <button onClick={handleViewStripeDashboard} className={actionStyles.menuButton}>
                        View Stripe Dashboard
                      </button>
                      <button onClick={handleExportCSV} className={actionStyles.menuButton}>
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
          <AdminStatsWidget
            title="Platform Financials"
            stats={[
              { label: 'Total Revenue', value: `£${((balances.total_revenue || 0) / 100).toFixed(2)}` },
              { label: 'Total Commission', value: `£${((balances.total_commission || 0) / 100).toFixed(2)}` },
              { label: 'Pending Payouts', value: `£${((balances.pending_payouts || 0) / 100).toFixed(2)}` },
              { label: 'Total Transactions', value: stats.all },
            ]}
          />
          <AdminHelpWidget
            title="Financial Management"
            items={[
              {
                question: 'What are transactions?',
                answer: 'View all platform transactions including bookings, payouts, and refunds across all users.',
              },
              {
                question: 'Transaction statuses?',
                answer:
                  'Clearing: Processing, Available: Ready for payout, Paid Out: Completed, Disputed: Under review, Refunded: Returned.',
              },
            ]}
          />
          <AdminTipWidget
            title="Financial Tips"
            tips={[
              'Monitor disputed transactions daily',
              'Review pending payouts weekly',
              'Export data for accounting',
              'Check Stripe Dashboard for details',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Empty State */}
      {paginatedTransactions.length === 0 && (
        <HubEmptyState
          title="No Transactions Found"
          description={
            searchQuery || dateRange !== 'all' || transactionType !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'Platform transactions will appear here once users start booking sessions.'
          }
        />
      )}

      {/* Transaction List - TODO: Create AdminTransactionCard component */}
      {paginatedTransactions.length > 0 && (
        <div className={styles.transactionsList}>
          {paginatedTransactions.map((transaction) => (
            <div key={transaction.id} className={styles.transactionCard}>
              <div className={styles.transactionHeader}>
                <span className={styles.transactionDate}>
                  {new Date(transaction.created_at).toLocaleDateString('en-GB')}
                </span>
                <span className={`${styles.transactionStatus} ${styles[`status-${transaction.status}`]}`}>
                  {transaction.status}
                </span>
              </div>
              <div className={styles.transactionBody}>
                <p className={styles.transactionDescription}>{transaction.description || 'No description'}</p>
                <p className={styles.transactionMeta}>
                  {transaction.user_email} • {transaction.type}
                </p>
              </div>
              <div className={styles.transactionFooter}>
                <span className={styles.transactionAmount}>
                  £{((transaction.amount || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalItems > ITEMS_PER_PAGE && (
        <HubPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}
    </HubPageLayout>
  );
}
