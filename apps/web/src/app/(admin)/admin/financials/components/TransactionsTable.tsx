/**
 * Filename: TransactionsTable.tsx
 * Purpose: Transactions-specific instance of HubDataTable
 * Created: 2025-12-28
 * Pattern: Instantiates generic HubDataTable with transaction-specific configuration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import { MoreVertical, Filter as FilterIcon } from 'lucide-react';
import styles from './TransactionsTable.module.css';

// Transaction type
interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  type: string;
  description?: string;
  user_email?: string;
  user_name?: string;
}

// Advanced filters type
interface AdvancedFilters {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  type: string;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getBadgeClass = () => {
    switch (status) {
      case 'clearing':
        return styles.badgeClearing;
      case 'available':
        return styles.badgeAvailable;
      case 'paid_out':
        return styles.badgePaidOut;
      case 'disputed':
        return styles.badgeDisputed;
      case 'refunded':
        return styles.badgeRefunded;
      default:
        return styles.badgeDefault;
    }
  };

  return (
    <span className={`${styles.badge} ${getBadgeClass()}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function TransactionsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    type: '',
  });

  // Calculate active filters
  const advancedFilterCount = Object.values(advancedFilters).filter((value) => value !== '').length;
  const advancedFiltersActive = advancedFilterCount > 0;

  // Fetch transactions data
  const { data: transactionsData, isLoading, refetch, error } = useQuery<{ transactions: Transaction[]; total: number }>({
    queryKey: ['admin-transactions', page, limit],
    queryFn: async () => {
      // TODO: Replace with real API endpoint
      // const response = await fetch(`/api/admin/financials/transactions?page=${page}&limit=${limit}`);
      // if (!response.ok) throw new Error('Failed to fetch transactions');
      // return response.json();

      // Mock data for now
      return {
        transactions: [],
        total: 0
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const transactions = transactionsData?.transactions || [];
  const total = transactionsData?.total || 0;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  // Define columns
  const columns: Column<Transaction>[] = [
    {
      key: 'created_at',
      label: 'Date',
      width: '15%',
      sortable: true,
      render: (txn) => <span className={styles.dateCell}>{formatDate(txn.created_at)}</span>
    },
    {
      key: 'user_email',
      label: 'User',
      width: '20%',
      sortable: true,
      render: (txn) => (
        <div>
          <div className={styles.emailCell}>{txn.user_email || '—'}</div>
          {txn.user_name && <div className={styles.nameCell}>{txn.user_name}</div>}
        </div>
      )
    },
    {
      key: 'description',
      label: 'Description',
      width: '25%',
      render: (txn) => txn.description || '—'
    },
    {
      key: 'type',
      label: 'Type',
      width: '12%',
      hideOnMobile: true,
      render: (txn) => <span className={styles.typeCell}>{txn.type || '—'}</span>
    },
    {
      key: 'amount',
      label: 'Amount',
      width: '15%',
      sortable: true,
      render: (txn) => (
        <span className={txn.amount >= 0 ? styles.amountPositive : styles.amountNegative}>
          {formatCurrency(txn.amount)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '13%',
      render: (txn) => <StatusBadge status={txn.status} />
    },
    {
      key: 'actions',
      label: '',
      width: '50px',
      render: (txn) => (
        <div className={styles.actionsCell}>
          <button
            className={styles.actionsButton}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX - 140,
              });
              setOpenMenuId(openMenuId === txn.id ? null : txn.id);
            }}
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === txn.id && menuPosition && (
            <div
              className={styles.actionsMenu}
              style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.actionMenuItem}>View Details</button>
              <button className={styles.actionMenuItem}>View in Stripe</button>
              <button className={styles.actionMenuItem}>Export Receipt</button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Define filters (matching BookingsTable pattern)
  const filters: Filter[] = [
    {
      key: 'status',
      label: 'All Statuses',
      options: [
        { label: 'Clearing', value: 'clearing' },
        { label: 'Available', value: 'available' },
        { label: 'Paid Out', value: 'paid_out' },
        { label: 'Disputed', value: 'disputed' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
  ];

  // Pagination config (matching BookingsTable pattern)
  const pagination: PaginationConfig = {
    page,
    limit,
    total,
    onPageChange: setPage,
    onLimitChange: (newLimit) => {
      setLimit(newLimit);
      setPage(1); // Reset to first page when changing page size
    },
    pageSizeOptions: [10, 20, 50, 100],
  };

  // Handle filter
  const handleFilterChange = (filterKey: string, value: string | string[]) => {
    const stringValue = Array.isArray(value) ? value[0] || '' : value;

    if (filterKey === 'status') {
      setStatusFilter(stringValue);
    }
    setPage(1); // Reset to first page on filter
  };

  // Export to CSV
  const handleExport = () => {
    if (!transactions.length) return;

    const headers = ['Date', 'User', 'Description', 'Type', 'Amount', 'Status'];
    const rows = transactions.map((txn) => [
      formatDate(txn.created_at),
      txn.user_email || '',
      txn.description || '',
      txn.type || '',
      formatCurrency(txn.amount),
      txn.status || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <HubDataTable
        columns={columns}
        data={transactions}
        loading={isLoading}
        onRefresh={() => refetch()}
        onExport={handleExport}
        onFilterChange={handleFilterChange}
        filters={filters}
        pagination={pagination}
        emptyMessage={error ? `Error loading transactions: ${error.message}` : "No transactions found."}
        searchPlaceholder="Search by user, description, or type..."
        autoRefreshInterval={30000}
        enableSavedViews={true}
        savedViewsKey="admin_transactions_savedViews"
        toolbarActions={
          <button
            className={`${styles.filtersButton} ${advancedFiltersActive ? styles.active : ''}`}
            onClick={() => {/* TODO: Open advanced filters drawer */}}
            title={advancedFiltersActive ? `${advancedFilterCount} filter(s) active` : 'Filters'}
          >
            <FilterIcon size={16} />
            {advancedFiltersActive && (
              <span className={styles.filtersBadge}>
                {advancedFilterCount}
              </span>
            )}
          </button>
        }
      />
    </>
  );
}
