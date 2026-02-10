/**
 * Filename: DisputesTable.tsx
 * Purpose: Disputes-specific instance of HubDataTable
 * Created: 2025-12-28
 * Pattern: Instantiates generic HubDataTable with dispute-specific configuration
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import { Filter as FilterIcon } from 'lucide-react';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import styles from './DisputesTable.module.css';
import StatusBadge from '@/app/components/admin/badges/StatusBadge';
import { exportToCSV, CSVFormatters, type CSVColumn } from '@/lib/utils/exportToCSV';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import AdminDisputeDetailModal, { type DisputeDetail } from './AdminDisputeDetailModal';

// Helper function to map dispute status to StatusBadge variant
function getDisputeStatusVariant(status: string) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'won') return 'completed' as const;
  if (statusLower === 'lost') return 'cancelled' as const;
  if (statusLower === 'under_review') return 'in_progress' as const;
  if (statusLower === 'action_required') return 'pending' as const;
  return 'neutral' as const;
}

// Dispute type (extends DisputeDetail for table display)
type Dispute = DisputeDetail;

// Advanced filters type
interface AdvancedFilters {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  reason: string;
}

export default function DisputesTable() {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
  const [_searchQuery, _setSearchQuery] = useState<string>('');
  const [_statusFilter, setStatusFilter] = useState<string>('');
  // Detail modal state
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  // Advanced filters state
  const [advancedFilters, _setAdvancedFilters] = useState<AdvancedFilters>({
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
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
    refetchInterval: ADMIN_TABLE_DEFAULTS.REFRESH_FAST,
  });

  const disputes = disputesData?.disputes || [];
  const total = disputesData?.total || 0;

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
      render: (dispute) => (
        <StatusBadge
          variant={getDisputeStatusVariant(dispute.status)}
          label={dispute.status.replace('_', ' ')}
        />
      )
    },
    {
      key: 'actions',
      label: '',
      width: '50px',
      render: (dispute) => (
        <VerticalDotsMenu
          actions={[
            {
              label: 'View Details',
              onClick: () => {
                setSelectedDispute(dispute);
                setIsDetailModalOpen(true);
              },
            },
            {
              label: 'View in Stripe',
              onClick: () => {
                const stripeUrl = dispute.stripe_dispute_id
                  ? `https://dashboard.stripe.com/disputes/${dispute.stripe_dispute_id}`
                  : 'https://dashboard.stripe.com/disputes';
                window.open(stripeUrl, '_blank');
              },
            },
            { label: 'Resolve Dispute', onClick: () => console.log('Resolve dispute', dispute.id) },
          ]}
        />
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

    const columns: CSVColumn<Dispute>[] = [
      { key: 'id', header: 'ID', format: (value) => formatIdForDisplay(value as string) },
      { key: 'created_at', header: 'Date', format: CSVFormatters.date },
      { key: 'user_email', header: 'User Email', format: (value) => value || 'N/A' },
      { key: 'user_name', header: 'User Name', format: (value) => value || 'N/A' },
      { key: 'reason', header: 'Reason', format: (value) => value || 'N/A' },
      { key: 'amount', header: 'Amount (£)', format: (value) => CSVFormatters.currency(value as number) },
      { key: 'response_due', header: 'Due Date', format: (value) => value ? CSVFormatters.date(value as string) : 'N/A' },
      { key: 'status', header: 'Status', format: (value) => (value as string).replace('_', ' ') },
    ];

    exportToCSV(disputes, columns, 'disputes');
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
        autoRefreshInterval={ADMIN_TABLE_DEFAULTS.REFRESH_FAST}
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

      {/* Detail Modal */}
      {selectedDispute && (
        <AdminDisputeDetailModal
          dispute={selectedDispute}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedDispute(null);
          }}
          onUpdate={() => refetch()}
        />
      )}
    </>
  );
}
