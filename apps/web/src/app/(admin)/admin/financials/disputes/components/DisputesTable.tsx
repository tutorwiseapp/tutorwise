/**
 * Filename: DisputesTable.tsx
 * Purpose: Disputes-specific instance of HubDataTable
 * Created: 2025-12-28
 * Pattern: Instantiates generic HubDataTable with dispute-specific configuration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import { MoreVertical, Filter as FilterIcon } from 'lucide-react';
import styles from './DisputesTable.module.css';

// Dispute type
interface Dispute {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  reason?: string;
  user_email?: string;
  user_name?: string;
  response_due?: string;
}

// Advanced filters type
interface AdvancedFilters {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  reason: string;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getBadgeClass = () => {
    switch (status) {
      case 'action_required':
        return styles.badgeActionRequired;
      case 'under_review':
        return styles.badgeUnderReview;
      case 'won':
        return styles.badgeWon;
      case 'lost':
        return styles.badgeLost;
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

export default function DisputesTable() {
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
    reason: '',
  });

  // Calculate active filters
  const advancedFilterCount = Object.values(advancedFilters).filter((value) => value !== '').length;
  const advancedFiltersActive = advancedFilterCount > 0;

  // Fetch disputes data
  const { data: disputesData, isLoading, refetch, error } = useQuery<{ disputes: Dispute[]; total: number }>({
    queryKey: ['admin-disputes', page, limit],
    queryFn: async () => {
      // TODO: Replace with real API endpoint
      // const response = await fetch(`/api/admin/financials/disputes?page=${page}&limit=${limit}`);
      // if (!response.ok) throw new Error('Failed to fetch disputes');
      // return response.json();

      // Mock data for now
      return {
        disputes: [],
        total: 0
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const disputes = disputesData?.disputes || [];
  const total = disputesData?.total || 0;

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
  const columns: Column<Dispute>[] = [
    {
      key: 'created_at',
      label: 'Date',
      width: '12%',
      sortable: true,
      render: (dispute) => <span className={styles.dateCell}>{formatDate(dispute.created_at)}</span>
    },
    {
      key: 'user_email',
      label: 'User',
      width: '20%',
      sortable: true,
      render: (dispute) => (
        <div>
          <div className={styles.emailCell}>{dispute.user_email || '—'}</div>
          {dispute.user_name && <div className={styles.nameCell}>{dispute.user_name}</div>}
        </div>
      )
    },
    {
      key: 'reason',
      label: 'Reason',
      width: '23%',
      render: (dispute) => <span className={styles.reasonCell}>{dispute.reason || '—'}</span>
    },
    {
      key: 'amount',
      label: 'Amount',
      width: '12%',
      sortable: true,
      render: (dispute) => (
        <span className={styles.amountCell}>
          {formatCurrency(dispute.amount)}
        </span>
      )
    },
    {
      key: 'response_due',
      label: 'Due Date',
      width: '12%',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (dispute) => <span className={styles.dueDateCell}>{formatDate(dispute.response_due)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      width: '14%',
      render: (dispute) => <StatusBadge status={dispute.status} />
    },
    {
      key: 'actions',
      label: '',
      width: '50px',
      render: (dispute) => (
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
              setOpenMenuId(openMenuId === dispute.id ? null : dispute.id);
            }}
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === dispute.id && menuPosition && (
            <div
              className={styles.actionsMenu}
              style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.actionMenuItem}>View Details</button>
              <button className={styles.actionMenuItem}>View in Stripe</button>
              <button className={styles.actionMenuItem}>Resolve Dispute</button>
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
        { label: 'Action Required', value: 'action_required' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
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
    if (!disputes.length) return;

    const headers = ['Date', 'User', 'Reason', 'Amount', 'Due Date', 'Status'];
    const rows = disputes.map((dispute) => [
      formatDate(dispute.created_at),
      dispute.user_email || '',
      dispute.reason || '',
      formatCurrency(dispute.amount),
      formatDate(dispute.response_due),
      dispute.status || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disputes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <HubDataTable
        columns={columns}
        data={disputes}
        loading={isLoading}
        onRefresh={() => refetch()}
        onExport={handleExport}
        onFilterChange={handleFilterChange}
        filters={filters}
        pagination={pagination}
        emptyMessage={error ? `Error loading disputes: ${error.message}` : "No disputes found."}
        searchPlaceholder="Search by user or reason..."
        autoRefreshInterval={30000}
        enableSavedViews={true}
        savedViewsKey="admin_disputes_savedViews"
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
