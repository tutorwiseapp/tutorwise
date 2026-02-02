/**
 * Filename: ReferralsTable.tsx
 * Purpose: Referrals-specific instance of HubDataTable for admin management
 * Created: 2025-12-27
 * Pattern: Follows BookingsTable and ListingsTable structure
 *
 * Features:
 * - 11 columns optimized for admin referral management
 * - Universal Column Order: ID → Date → Service → Domain → Actions
 * - Status, agent, and conversion filters
 * - CSV export functionality
 * - Real-time updates (30s auto-refresh)
 * - Saved filter views
 * - Bulk actions (approve, expire referrals)
 *
 * Table Columns:
 * 1. ID - Referral UUID (8-char truncated with #prefix)
 * 2. Created - Referral creation date
 * 3. Status - Referred/Signed Up/Converted/Expired
 * 4. Agent - Agent who created the referral
 * 5. Referred User - User who was referred (if signed up)
 * 6. Converted - Conversion date (if converted)
 * 7. First Booking - First booking details (if converted)
 * 8. Commission - Commission amount (if paid)
 * 9. Attribution - Attribution method (URL/Cookie/Manual)
 * 10. Days Active - Days since referral created
 * 11. Actions - Row actions menu
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig, BulkAction } from '@/app/components/hub/data';
import { Referral } from '@/types';
import AdminReferralDetailModal from './AdminReferralDetailModal';
import { Filter as FilterIcon, Save } from 'lucide-react';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import styles from './ReferralsTable.module.css';
import AdvancedFiltersDrawer, { AdvancedFilters } from './AdvancedFiltersDrawer';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import StatusBadge from '@/app/components/admin/badges/StatusBadge';
import { exportToCSV, CSVFormatters, type CSVColumn } from '@/lib/utils/exportToCSV';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';

// Helper to map referral status to badge variant
function getReferralStatusVariant(status: string) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'converted') return 'completed' as const;
  if (statusLower === 'signed up') return 'confirmed' as const;
  if (statusLower === 'referred') return 'pending' as const;
  if (statusLower === 'expired') return 'cancelled' as const;
  return 'neutral' as const;
}

export default function ReferralsTable() {
  const supabase = createClient();

  // Table state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Advanced filters state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    minDaysActive: undefined,
    maxDaysActive: undefined,
    attributionMethod: '',
    hasCommission: false,
    convertedOnly: false,
  });

  // Modal state
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch referrals with joined data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'admin-referrals',
      page,
      limit,
      sortKey,
      sortDirection,
      searchQuery,
      statusFilter,
      agentFilter,
      advancedFilters,
    ],
    queryFn: async () => {
      let query = supabase
        .from('referrals')
        .select(
          `
          *,
          agent:agent_id(id, full_name, email, avatar_url, referral_code),
          referred_user:referred_profile_id(id, full_name, email, avatar_url),
          first_booking:booking_id(
            id,
            service_name,
            amount,
            client:client_id(id, full_name, email, avatar_url),
            tutor:tutor_id(id, full_name, email, avatar_url)
          ),
          first_commission:transaction_id(id, amount)
        `,
          { count: 'exact' }
        );

      // Apply search filter (agent name or referred user name)
      if (searchQuery) {
        query = query.or(
          `agent.full_name.ilike.%${searchQuery}%,referred_user.full_name.ilike.%${searchQuery}%`
        );
      }

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply agent filter
      if (agentFilter && agentFilter !== 'all') {
        query = query.eq('agent_id', agentFilter);
      }

      // Apply advanced filters
      if (advancedFilters.convertedOnly) {
        query = query.eq('status', 'Converted');
      }

      if (advancedFilters.hasCommission) {
        query = query.not('transaction_id', 'is', null);
      }

      if (advancedFilters.attributionMethod && advancedFilters.attributionMethod !== 'all') {
        query = query.eq('attribution_method', advancedFilters.attributionMethod);
      }

      // Apply sorting
      query = query.order(sortKey, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      // Flatten foreign key arrays (Supabase returns arrays for foreign keys)
      const referrals = (data || []).map((item: any) => ({
        ...item,
        agent: Array.isArray(item.agent) ? item.agent[0] : item.agent,
        referred_user: Array.isArray(item.referred_user) ? item.referred_user[0] : item.referred_user,
        first_booking: Array.isArray(item.first_booking) ? item.first_booking[0] : item.first_booking,
        first_commission: Array.isArray(item.first_commission)
          ? item.first_commission[0]
          : item.first_commission,
      })) as Referral[];

      return {
        referrals,
        total: count || 0,
      };
    },
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
    retry: 2,
  });

  // Calculate days active for a referral
  const getDaysActive = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString?: string | null, format: string = 'dd MMM yyyy') => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Handle export to CSV using shared utility
  const handleExport = () => {
    if (!data?.referrals) return;

    const columns: CSVColumn<any>[] = [
      { key: 'id', header: 'ID', format: (value) => formatIdForDisplay(value, 'full') },
      { key: 'created_at', header: 'Created', format: (value) => CSVFormatters.date(value) },
      { key: 'status', header: 'Status' },
      {
        key: 'agent',
        header: 'Agent',
        format: (value: any) => value?.full_name || '—',
      },
      {
        key: 'referred_user',
        header: 'Referred User',
        format: (value: any) => value?.full_name || 'Not signed up',
      },
      {
        key: 'id',
        header: 'Other Party',
        format: (value, row: any) => {
          const firstBooking = row.first_booking;
          const referredUser = row.referred_user;
          const client = firstBooking ? firstBooking.client : null;
          const tutor = firstBooking ? firstBooking.tutor : null;
          const otherParty = referredUser && client && referredUser.id === client.id ? tutor : client;
          return otherParty?.full_name || '—';
        },
      },
      { key: 'converted_at', header: 'Converted At', format: (value) => CSVFormatters.date(value) },
      {
        key: 'first_booking',
        header: 'First Booking',
        format: (value: any) => value?.service_name || '—',
      },
      {
        key: 'first_commission',
        header: 'Commission',
        format: (value: any) => (value ? CSVFormatters.currency(value.amount) : '—'),
      },
      {
        key: 'attribution_method',
        header: 'Attribution',
        format: (value) => value || 'Unknown',
      },
    ];

    exportToCSV(data.referrals, columns, 'referrals');
  };

  // Table columns definition - UNIVERSAL COLUMN ORDER: ID → Date → Service → Domain → Actions
  const columns: Column<Referral>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (referral: Referral) => (
        <span className={styles.idCell}>{formatIdForDisplay(referral.id)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (referral: Referral) => (
        <span className={styles.dateCell}>{formatDate(referral.created_at)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (referral: Referral) => (
        <StatusBadge variant={getReferralStatusVariant(referral.status)} label={referral.status} />
      ),
    },
    {
      key: 'agent',
      label: 'Agent',
      sortable: false,
      render: (referral: Referral) => {
        const agent = (referral as any).agent;
        if (!agent) return <span>—</span>;
        return (
          <div className={styles.profileCell}>
            {agent.avatar_url && (
              <img
                src={agent.avatar_url}
                alt={agent.full_name}
                className={styles.avatar}
              />
            )}
            <span>{agent.full_name}</span>
          </div>
        );
      },
    },
    {
      key: 'referred_user',
      label: 'Referred User',
      sortable: false,
      render: (referral: Referral) => {
        const referredUser = (referral as any).referred_user;
        if (!referredUser) return <span className={styles.emptyCell}>Not signed up</span>;
        return (
          <div className={styles.profileCell}>
            {referredUser.avatar_url && (
              <img
                src={referredUser.avatar_url}
                alt={referredUser.full_name}
                className={styles.avatar}
              />
            )}
            <span>{referredUser.full_name}</span>
          </div>
        );
      },
    },
    {
      key: 'other_party',
      label: 'Other Party',
      sortable: false,
      render: (referral: Referral) => {
        const firstBooking = (referral as any).first_booking;
        const referredUser = (referral as any).referred_user;

        if (!firstBooking) return <span>—</span>;

        // Determine who the "other party" is (the person who transacted with the referred user)
        const client = (firstBooking as any).client;
        const tutor = (firstBooking as any).tutor;

        // If referred user is the client, show the tutor; if referred user is the tutor, show the client
        const otherParty = referredUser && client && referredUser.id === client.id ? tutor : client;

        if (!otherParty) return <span>—</span>;

        return (
          <div className={styles.profileCell}>
            {otherParty.avatar_url && (
              <img
                src={otherParty.avatar_url}
                alt={otherParty.full_name}
                className={styles.avatar}
              />
            )}
            <span>{otherParty.full_name}</span>
          </div>
        );
      },
    },
    {
      key: 'converted_at',
      label: 'Converted',
      sortable: true,
      render: (referral: Referral) => (
        <span className={styles.dateCell}>{formatDate(referral.converted_at)}</span>
      ),
    },
    {
      key: 'first_booking',
      label: 'First Booking',
      sortable: false,
      render: (referral: Referral) => {
        const firstBooking = (referral as any).first_booking;
        if (!firstBooking) return <span>—</span>;
        return (
          <div className={styles.bookingCell}>
            <div className={styles.serviceName}>{firstBooking.service_name}</div>
            <div className={styles.amount}>{formatCurrency(firstBooking.amount)}</div>
          </div>
        );
      },
    },
    {
      key: 'commission',
      label: 'Commission',
      sortable: false,
      render: (referral: Referral) => {
        const firstCommission = (referral as any).first_commission;
        if (!firstCommission) return <span>—</span>;
        return <span className={styles.commissionCell}>{formatCurrency(firstCommission.amount)}</span>;
      },
    },
    {
      key: 'attribution_method',
      label: 'Attribution',
      sortable: false,
      render: (referral: Referral) => {
        const method = (referral as any).attribution_method || 'Unknown';
        return <span className={styles.attributionBadge}>{method}</span>;
      },
    },
    {
      key: 'days_active',
      label: 'Days Active',
      sortable: false,
      render: (referral: Referral) => {
        const days = getDaysActive(referral.created_at);
        return <span className={styles.daysCell}>{days}d</span>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (referral: Referral) => (
        <VerticalDotsMenu
          actions={[
            {
              label: 'View Details',
              onClick: () => {
                setSelectedReferral(referral);
                setIsModalOpen(true);
              },
            },
            {
              label: 'Mark as Expired',
              onClick: async () => {
                if (!confirm('Mark this referral as expired?')) return;

                const { error } = await supabase
                  .from('referrals')
                  .update({ status: 'Expired' })
                  .eq('id', referral.id);

                if (error) {
                  alert('Failed to expire referral');
                } else {
                  refetch();
                }
              },
            },
          ]}
        />
      ),
    },
  ];

  // Filters
  const filters: Filter[] = [
    {
      key: 'status',
      label: 'All Statuses',
      options: [
        { label: 'Referred', value: 'Referred' },
        { label: 'Signed Up', value: 'Signed Up' },
        { label: 'Converted', value: 'Converted' },
        { label: 'Expired', value: 'Expired' },
      ],
    },
  ];

  // Bulk actions
  const bulkActions: BulkAction[] = [
    {
      value: 'expire',
      label: 'Mark as Expired',
      variant: 'secondary',
      onClick: async (selectedIds: string[]) => {
        if (!confirm(`Mark ${selectedIds.length} referral(s) as expired?`)) return;

        const { error } = await supabase
          .from('referrals')
          .update({ status: 'Expired' })
          .in('id', selectedIds);

        if (error) {
          alert('Failed to expire referrals');
          return;
        }

        alert(`Successfully expired ${selectedIds.length} referral(s)`);
        refetch();
        setSelectedRows(new Set());
      },
    },
  ];

  // Pagination config
  const paginationConfig: PaginationConfig = {
    page,
    limit,
    total: data?.total || 0,
    onPageChange: setPage,
    onLimitChange: setLimit,
  };

  // Mobile card renderer
  const renderMobileCard = (referral: Referral) => {
    const agent = (referral as any).agent;
    const referredUser = (referral as any).referred_user;
    const firstCommission = (referral as any).first_commission;

    return (
      <div
        className={styles.mobileCard}
        onClick={() => {
          setSelectedReferral(referral);
          setIsModalOpen(true);
        }}
      >
        <div className={styles.mobileCardHeader}>
          <span className={styles.mobileCardId}>{formatIdForDisplay(referral.id)}</span>
          <StatusBadge variant={getReferralStatusVariant(referral.status)} label={referral.status} />
        </div>
        <div className={styles.mobileCardBody}>
          <div className={styles.mobileCardRow}>
            <span className={styles.mobileCardLabel}>Agent:</span>
            <span>{agent?.full_name || '—'}</span>
          </div>
          <div className={styles.mobileCardRow}>
            <span className={styles.mobileCardLabel}>Referred:</span>
            <span>{referredUser?.full_name || 'Not signed up'}</span>
          </div>
          <div className={styles.mobileCardRow}>
            <span className={styles.mobileCardLabel}>Created:</span>
            <span>{formatDate(referral.created_at)}</span>
          </div>
          {firstCommission && (
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileCardLabel}>Commission:</span>
              <span>{formatCurrency(firstCommission.amount)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Toolbar actions (Advanced Filters button with active count)
  const activeFilterCount = Object.values(advancedFilters).filter((v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v !== '' && v !== 'all';
    return false;
  }).length;

  const hasActiveFilters = activeFilterCount > 0;

  const toolbarActions = (
    <button
      onClick={() => setIsDrawerOpen(true)}
      className={`${styles.advancedFiltersButton} ${hasActiveFilters ? styles.active : ''}`}
      title={hasActiveFilters ? `${activeFilterCount} filter(s) active` : 'Advanced Filters'}
    >
      <FilterIcon className={styles.buttonIcon} />
      {activeFilterCount > 0 && <span className={styles.filtersBadge}>{activeFilterCount}</span>}
    </button>
  );

  return (
    <>
      <HubDataTable
        columns={columns}
        data={data?.referrals || []}
        loading={isLoading}
        error={error ? 'Failed to load referrals. Please try again.' : undefined}
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={(referral) => referral.id}
        onRowClick={(referral: Referral) => {
          setSelectedReferral(referral);
          setIsModalOpen(true);
        }}
        onSort={(key, direction) => {
          setSortKey(key);
          setSortDirection(direction);
        }}
        onSearch={(query) => {
          setSearchQuery(query);
          setPage(1);
        }}
        onFilterChange={(filterKey, value) => {
          if (filterKey === 'status') {
            setStatusFilter(value as string);
          }
          setPage(1);
        }}
        onExport={handleExport}
        onRefresh={() => refetch()}
        pagination={paginationConfig}
        filters={filters}
        bulkActions={bulkActions}
        autoRefreshInterval={ADMIN_TABLE_DEFAULTS.REFRESH_FAST}
        enableSavedViews={true}
        savedViewsKey="admin_referrals_savedViews"
        searchPlaceholder="Search by agent or referred user..."
        emptyMessage="No referrals found"
        mobileCard={renderMobileCard}
        toolbarActions={toolbarActions}
      />

      {/* Advanced Filters Drawer */}
      <AdvancedFiltersDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
      />

      {/* Detail Modal */}
      {selectedReferral && (
        <AdminReferralDetailModal
          referral={selectedReferral}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedReferral(null);
          }}
          onUpdate={refetch}
        />
      )}
    </>
  );
}
