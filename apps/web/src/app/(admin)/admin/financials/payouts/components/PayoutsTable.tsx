/**
 * Filename: PayoutsTable.tsx
 * Purpose: Payouts-specific instance of HubDataTable
 * Created: 2025-12-28
 * Pattern: Instantiates generic HubDataTable with payout-specific configuration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import { MoreVertical, Filter as FilterIcon } from 'lucide-react';
import StatusBadge from '@/app/components/admin/badges/StatusBadge';
import { exportToCSV, CSVFormatters, type CSVColumn } from '@/lib/utils/exportToCSV';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import styles from './PayoutsTable.module.css';

// Payout type
interface Payout {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  user_email?: string;
  user_name?: string;
  bank_account?: string;
  arrival_date?: string;
}

// Advanced filters type
interface AdvancedFilters {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  user: string;
}

// Status variant helper
function getPayoutStatusVariant(status: string) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'paid' || statusLower === 'completed') return 'paid' as const;
  if (statusLower === 'pending') return 'pending' as const;
  if (statusLower === 'in_transit') return 'processing' as const;
  if (statusLower === 'failed') return 'error' as const;
  return 'neutral' as const;
}

export default function PayoutsTable() {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    user: '',
  });

  // Calculate active filters
  const advancedFilterCount = Object.values(advancedFilters).filter((value) => value !== '').length;
  const advancedFiltersActive = advancedFilterCount > 0;

  // Fetch payouts data
  const { data: payoutsData, isLoading, refetch, error } = useQuery<{ payouts: Payout[]; total: number }>({
    queryKey: ['admin-payouts', page, limit],
    queryFn: async () => {
      // TODO: Replace with real API endpoint
      // const response = await fetch(`/api/admin/financials/payouts?page=${page}&limit=${limit}`);
      // if (!response.ok) throw new Error('Failed to fetch payouts');
      // return response.json();

      // Mock data for now
      return {
        payouts: [],
        total: 0
      };
    },
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
    refetchInterval: ADMIN_TABLE_DEFAULTS.REFRESH_FAST,
  });

  const payouts = payoutsData?.payouts || [];
  const total = payoutsData?.total || 0;

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
  const columns: Column<Payout>[] = [
    {
      key: 'created_at',
      label: 'Date',
      width: '12%',
      sortable: true,
      render: (payout) => <span className={styles.dateCell}>{formatDate(payout.created_at)}</span>
    },
    {
      key: 'user_email',
      label: 'User',
      width: '20%',
      sortable: true,
      render: (payout) => (
        <div>
          <div className={styles.emailCell}>{payout.user_email || '—'}</div>
          {payout.user_name && <div className={styles.nameCell}>{payout.user_name}</div>}
        </div>
      )
    },
    {
      key: 'bank_account',
      label: 'Bank Account',
      width: '18%',
      hideOnMobile: true,
      render: (payout) => <span className={styles.bankCell}>{payout.bank_account || '—'}</span>
    },
    {
      key: 'amount',
      label: 'Amount',
      width: '15%',
      sortable: true,
      render: (payout) => (
        <span className={styles.amountCell}>
          {formatCurrency(payout.amount)}
        </span>
      )
    },
    {
      key: 'arrival_date',
      label: 'Arrival Date',
      width: '15%',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (payout) => <span className={styles.dateCell}>{formatDate(payout.arrival_date)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      width: '13%',
      render: (payout) => (
        <StatusBadge
          variant={getPayoutStatusVariant(payout.status)}
          label={payout.status.replace('_', ' ')}
        />
      )
    },
    {
      key: 'actions',
      label: '',
      width: '50px',
      render: (payout) => (
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
              setOpenMenuId(openMenuId === payout.id ? null : payout.id);
            }}
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === payout.id && menuPosition && (
            <div
              className={styles.actionsMenu}
              style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.actionMenuItem}>View Details</button>
              <button className={styles.actionMenuItem}>View in Stripe</button>
              <button className={styles.actionMenuItem}>Approve Payout</button>
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
        { label: 'Pending', value: 'pending' },
        { label: 'In Transit', value: 'in_transit' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
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
    if (!payouts.length) return;

    const columns: CSVColumn<Payout>[] = [
      { key: 'id', header: 'ID', format: (value) => formatIdForDisplay(value as string) },
      { key: 'created_at', header: 'Date', format: CSVFormatters.date },
      { key: 'user_email', header: 'User Email', format: (value) => value || 'N/A' },
      { key: 'user_name', header: 'User Name', format: (value) => value || 'N/A' },
      { key: 'bank_account', header: 'Bank Account', format: (value) => value || 'N/A' },
      { key: 'amount', header: 'Amount (£)', format: (value) => formatCurrency(value as number) },
      { key: 'arrival_date', header: 'Arrival Date', format: (value) => value ? CSVFormatters.date(value as string) : 'N/A' },
      { key: 'status', header: 'Status', format: (value) => (value as string).replace('_', ' ') },
    ];

    exportToCSV(payouts, columns, 'payouts');
  };

  return (
    <>
      <HubDataTable
        columns={columns}
        data={payouts}
        loading={isLoading}
        onRefresh={() => refetch()}
        onExport={handleExport}
        onFilterChange={handleFilterChange}
        filters={filters}
        pagination={pagination}
        emptyMessage={error ? `Error loading payouts: ${error.message}` : "No payouts found."}
        searchPlaceholder="Search by user or bank account..."
        autoRefreshInterval={ADMIN_TABLE_DEFAULTS.REFRESH_FAST}
        enableSavedViews={true}
        savedViewsKey="admin_payouts_savedViews"
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
