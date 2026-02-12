/**
 * Filename: src/app/(admin)/admin/edupay/components/ConversionsTable.tsx
 * Purpose: Admin table for viewing and managing EP conversions
 * Created: 2026-02-12
 * Updated: 2026-02-12 - Refactored to use HubDataTable and VerticalDotsMenu
 * Pattern: Follows UsersTable pattern with HubDataTable
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import ConversionDetailsModal from './ConversionDetailsModal';
import MarkCompletedModal from './MarkCompletedModal';
import styles from './ConversionsTable.module.css';

interface ConversionWithUser {
  id: string;
  user_id: string;
  ep_amount: number;
  gbp_amount_pence: number;
  platform_fee_pence: number;
  net_amount_pence: number;
  destination: 'student_loan' | 'isa' | 'savings';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  failure_reason: string | null;
  truelayer_payment_id: string | null;
  created_at: string;
  completed_at: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusClass = () => {
    switch (status) {
      case 'completed':
        return styles.badgeCompleted;
      case 'pending':
      case 'processing':
        return styles.badgePending;
      case 'failed':
        return styles.badgeFailed;
      default:
        return styles.badgeDefault;
    }
  };

  return (
    <span className={`${styles.badge} ${getStatusClass()}`}>
      {status}
    </span>
  );
}

// Destination badge component
function DestinationBadge({ destination }: { destination: string }) {
  const getLabel = () => {
    switch (destination) {
      case 'student_loan':
        return 'Student Loan';
      case 'isa':
        return 'ISA';
      case 'savings':
        return 'Savings';
      default:
        return destination;
    }
  };

  const getClass = () => {
    switch (destination) {
      case 'student_loan':
        return styles.destinationLoan;
      case 'isa':
        return styles.destinationIsa;
      case 'savings':
        return styles.destinationSavings;
      default:
        return '';
    }
  };

  return (
    <span className={`${styles.destinationBadge} ${getClass()}`}>
      {getLabel()}
    </span>
  );
}

export default function ConversionsTable() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isMarkCompletedModalOpen, setIsMarkCompletedModalOpen] = useState(false);
  const [selectedConversion, setSelectedConversion] = useState<ConversionWithUser | null>(null);

  // Fetch conversions with user profiles
  const { data: conversionsData, isLoading, refetch, error } = useQuery<{ conversions: ConversionWithUser[]; total: number }>({
    queryKey: ['admin-edupay-conversions-table', page, limit],
    queryFn: async () => {
      // Get total count
      const { count } = await supabase
        .from('edupay_conversions')
        .select('*', { count: 'exact', head: true });

      // Get paginated data
      const { data, error } = await supabase
        .from('edupay_conversions')
        .select(`
          id,
          user_id,
          ep_amount,
          gbp_amount_pence,
          platform_fee_pence,
          net_amount_pence,
          destination,
          status,
          failure_reason,
          truelayer_payment_id,
          created_at,
          completed_at,
          profiles!edupay_conversions_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        throw new Error(`Failed to fetch conversions: ${error.message}`);
      }

      return {
        conversions: data as unknown as ConversionWithUser[],
        total: count || 0,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const conversions = conversionsData?.conversions || [];

  // Retry failed conversion mutation
  const retryMutation = useMutation({
    mutationFn: async (conversionId: string) => {
      const { error } = await supabase
        .from('edupay_conversions')
        .update({ status: 'pending', failure_reason: null })
        .eq('id', conversionId);

      if (error) {
        throw new Error(`Failed to retry conversion: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-edupay-conversions-table'] });
      queryClient.invalidateQueries({ queryKey: ['admin-edupay-metrics'] });
    },
  });

  // Format currency
  const formatCurrency = (pence: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(pence / 100);
  };

  // Format EP
  const formatEP = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Action handlers
  const handleViewDetails = (conversion: ConversionWithUser) => {
    setSelectedConversion(conversion);
    setIsDetailsModalOpen(true);
  };

  const handleRetryConversion = (conversion: ConversionWithUser) => {
    if (confirm(`Retry conversion ${formatIdForDisplay(conversion.id)}?\n\nThis will reset the status to pending.`)) {
      retryMutation.mutate(conversion.id);
    }
  };

  const handleContactUser = (conversion: ConversionWithUser) => {
    if (conversion.profiles?.email) {
      window.location.href = `mailto:${conversion.profiles.email}`;
    }
  };

  const handleMarkCompleted = (conversion: ConversionWithUser) => {
    setSelectedConversion(conversion);
    setIsMarkCompletedModalOpen(true);
  };

  // Define columns following universal column order: ID → Created → User → Domain Fields → Actions
  const columns: Column<ConversionWithUser>[] = [
    {
      key: 'id',
      label: 'ID',
      width: '100px',
      render: (conversion) => (
        <span className={styles.idCell}>{formatIdForDisplay(conversion.id)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '120px',
      sortable: true,
      hideOnMobile: true,
      render: (conversion) => (
        <span className={styles.dateCell}>{formatDate(conversion.created_at)}</span>
      ),
    },
    {
      key: 'user',
      label: 'User',
      width: '180px',
      render: (conversion) => (
        <div className={styles.userInfo}>
          <span className={styles.userName}>
            {conversion.profiles?.full_name || 'Unknown User'}
          </span>
          <span className={styles.userEmail}>
            {conversion.profiles?.email || formatIdForDisplay(conversion.user_id)}
          </span>
        </div>
      ),
    },
    {
      key: 'ep_amount',
      label: 'EP Amount',
      width: '100px',
      sortable: true,
      render: (conversion) => (
        <span className={styles.epValue}>{formatEP(conversion.ep_amount)}</span>
      ),
    },
    {
      key: 'gbp_amount_pence',
      label: 'GBP Value',
      width: '100px',
      hideOnMobile: true,
      render: (conversion) => (
        <span className={styles.gbpValue}>{formatCurrency(conversion.gbp_amount_pence)}</span>
      ),
    },
    {
      key: 'platform_fee_pence',
      label: 'Fee',
      width: '80px',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (conversion) => formatCurrency(conversion.platform_fee_pence),
    },
    {
      key: 'destination',
      label: 'Destination',
      width: '120px',
      hideOnMobile: true,
      render: (conversion) => (
        <DestinationBadge destination={conversion.destination} />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (conversion) => (
        <div className={styles.statusCell}>
          <StatusBadge status={conversion.status} />
          {conversion.failure_reason && (
            <span className={styles.failureReason} title={conversion.failure_reason}>
              {conversion.failure_reason.substring(0, 20)}...
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (conversion) => (
        <VerticalDotsMenu
          actions={[
            { label: 'View Details', onClick: () => handleViewDetails(conversion) },
            { label: 'Contact User', onClick: () => handleContactUser(conversion) },
            ...(conversion.status === 'failed' ? [
              { label: 'Retry Conversion', onClick: () => handleRetryConversion(conversion) },
            ] : []),
            ...(conversion.status === 'pending' || conversion.status === 'processing' ? [
              { label: 'Mark Completed', onClick: () => handleMarkCompleted(conversion) },
            ] : []),
          ]}
        />
      ),
    },
  ];

  // Define filters
  const filters: Filter[] = [
    {
      key: 'status',
      label: 'All Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      key: 'destination',
      label: 'All Destinations',
      options: [
        { label: 'Student Loan', value: 'student_loan' },
        { label: 'ISA', value: 'isa' },
        { label: 'Savings', value: 'savings' },
      ],
    },
  ];

  // Pagination config
  const paginationConfig: PaginationConfig = {
    page,
    limit,
    total: conversionsData?.total || 0,
    onPageChange: setPage,
    onLimitChange: (newLimit) => {
      setLimit(newLimit);
      setPage(1);
    },
    pageSizeOptions: [10, 20, 50, 100],
  };

  // Handle export to CSV
  const handleExport = () => {
    if (!conversions || conversions.length === 0) return;

    const headers = ['ID', 'User', 'Email', 'EP Amount', 'GBP Value', 'Platform Fee', 'Net Amount', 'Destination', 'Status', 'Created', 'Completed'];
    const rows = conversions.map((conversion) => [
      conversion.id,
      conversion.profiles?.full_name || 'Unknown',
      conversion.profiles?.email || 'N/A',
      conversion.ep_amount,
      formatCurrency(conversion.gbp_amount_pence),
      formatCurrency(conversion.platform_fee_pence),
      formatCurrency(conversion.net_amount_pence),
      conversion.destination,
      conversion.status,
      formatDate(conversion.created_at),
      formatDate(conversion.completed_at),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edupay-conversions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Conversion Details Modal */}
      <ConversionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        conversion={selectedConversion}
        onMarkCompleted={(conv) => {
          setIsDetailsModalOpen(false);
          handleMarkCompleted(conv);
        }}
        onRetry={(conv) => {
          setIsDetailsModalOpen(false);
          handleRetryConversion(conv);
        }}
      />

      {/* Mark Completed Modal */}
      <MarkCompletedModal
        isOpen={isMarkCompletedModalOpen}
        onClose={() => setIsMarkCompletedModalOpen(false)}
        conversion={selectedConversion}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-edupay-conversions-table'] });
          queryClient.invalidateQueries({ queryKey: ['admin-edupay-metrics'] });
        }}
      />

      <HubDataTable
        columns={columns}
        data={conversions}
        loading={isLoading}
        onRefresh={() => refetch()}
        onExport={handleExport}
        filters={filters}
        pagination={paginationConfig}
        emptyMessage={error ? `Error loading conversions: ${error.message}` : 'No EP conversions found.'}
        searchPlaceholder="Search by name, email, or ID..."
        autoRefreshInterval={30000}
        enableSavedViews={true}
        savedViewsKey="admin_edupay_conversions_savedViews"
      />
    </>
  );
}
