/**
 * Filename: BookingsTable.tsx
 * Purpose: Bookings-specific instance of HubDataTable with Phase 2 features
 * Created: 2025-12-24
 * Updated: 2025-12-24 - Added Phase 2 features
 * Pattern: Instantiates generic HubDataTable with booking-specific configuration
 *
 * Features (Phase 1):
 * - 9 columns optimized for admin bookings management
 * - Status and date filters
 * - CSV export functionality
 * - Mobile fallback to BookingCard component
 * - Server-side pagination (50 per page)
 * - Sort by date, amount, status
 *
 * Features (Phase 2):
 * - Real-time updates (30s auto-refresh)
 * - Saved filter views
 * - Bulk actions (approve, cancel bookings)
 * - Keyboard shortcuts
 *
 * Usage:
 * <BookingsTable />
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig, BulkAction } from '@/app/components/hub/data';
import { Booking } from '@/types';
import BookingCard from '@/app/components/feature/bookings/BookingCard';
import AdminBookingDetailModal from './AdminBookingDetailModal';
import { MoreVertical, Filter as FilterIcon } from 'lucide-react';
import styles from './BookingsTable.module.css';
import AdvancedFiltersDrawer, { AdvancedFilters } from './AdvancedFiltersDrawer';

// Status badge component with tooltip
function StatusBadge({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return styles.statusConfirmed;
      case 'Completed':
        return styles.statusCompleted;
      case 'Cancelled':
        return styles.statusCancelled;
      case 'Pending':
      default:
        return styles.statusPending;
    }
  };

  const getStatusTooltip = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Awaiting confirmation from tutor or admin approval';
      case 'Confirmed':
        return 'Booking confirmed and scheduled';
      case 'Completed':
        return 'Session has been completed';
      case 'Cancelled':
        return 'Booking has been cancelled';
      default:
        return status;
    }
  };

  return (
    <span
      className={`${styles.statusBadge} ${getStatusColor(status)}`}
      title={getStatusTooltip(status)}
    >
      {status}
    </span>
  );
}

// Payment status badge component with tooltip
function PaymentBadge({ status }: { status: string }) {
  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return styles.paymentPaid;
      case 'Pending':
        return styles.paymentPending;
      case 'Refunded':
        return styles.paymentRefunded;
      case 'Failed':
      default:
        return styles.paymentFailed;
    }
  };

  const getPaymentTooltip = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Payment awaiting processing';
      case 'Paid':
        return 'Payment successfully processed';
      case 'Refunded':
        return 'Payment has been refunded to client';
      case 'Failed':
        return 'Payment processing failed';
      default:
        return status;
    }
  };

  return (
    <span
      className={`${styles.paymentBadge} ${getPaymentColor(status)}`}
      title={getPaymentTooltip(status)}
    >
      {status}
    </span>
  );
}

export default function BookingsTable() {
  const supabase = createClient();

  // Table state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortKey, setSortKey] = useState<string>('session_start_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Advanced filters state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    bookingType: '',
    client: '',
    agent: '',
    tutor: '',
    amountMin: '',
    amountMax: '',
  });

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Actions menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Fetch dropdown data for filters (unique profiles from bookings)
  const { data: filterOptionsData } = useQuery({
    queryKey: ['admin-bookings-filter-options'],
    queryFn: async () => {
      // Fetch unique clients
      const { data: clientsData } = await supabase
        .from('bookings')
        .select('client:profiles!bookings_client_id_fkey(id, full_name)')
        .not('client_id', 'is', null)
        .order('client_id');

      // Fetch unique agents
      const { data: agentsData } = await supabase
        .from('bookings')
        .select('agent:profiles!bookings_agent_id_fkey(id, full_name)')
        .not('agent_id', 'is', null)
        .order('agent_id');

      // Fetch unique tutors
      const { data: tutorsData } = await supabase
        .from('bookings')
        .select('tutor:profiles!bookings_tutor_id_fkey(id, full_name)')
        .not('tutor_id', 'is', null)
        .order('tutor_id');

      // Extract unique profiles
      const uniqueClients = Array.from(
        new Map(
          clientsData
            ?.map((item: any) => {
              const client = Array.isArray(item.client) ? item.client[0] : item.client;
              return client;
            })
            .filter(Boolean)
            .map((client: any) => [client.id, client])
        ).values()
      );

      const uniqueAgents = Array.from(
        new Map(
          agentsData
            ?.map((item: any) => {
              const agent = Array.isArray(item.agent) ? item.agent[0] : item.agent;
              return agent;
            })
            .filter(Boolean)
            .map((agent: any) => [agent.id, agent])
        ).values()
      );

      const uniqueTutors = Array.from(
        new Map(
          tutorsData
            ?.map((item: any) => {
              const tutor = Array.isArray(item.tutor) ? item.tutor[0] : item.tutor;
              return tutor;
            })
            .filter(Boolean)
            .map((tutor: any) => [tutor.id, tutor])
        ).values()
      );

      return {
        clients: uniqueClients,
        agents: uniqueAgents,
        tutors: uniqueTutors,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch bookings with pagination and filters
  const { data: bookingsData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-bookings', page, limit, sortKey, sortDirection, searchQuery, statusFilter, dateFilter, advancedFilters],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(`
          id,
          client_id,
          tutor_id,
          listing_id,
          agent_id,
          referrer_role,
          booking_type,
          booking_source,
          service_name,
          session_start_time,
          session_duration,
          amount,
          status,
          payment_status,
          subjects,
          levels,
          location_type,
          location_city,
          free_trial,
          hourly_rate,
          listing_slug,
          available_free_help,
          created_at,
          updated_at,
          client:profiles!bookings_client_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          tutor:profiles!bookings_tutor_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          ),
          agent:profiles!bookings_agent_id_fkey (
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      // Apply search filter (booking ID, service name, client name, tutor name)
      if (searchQuery) {
        query = query.or(`id.ilike.%${searchQuery}%,service_name.ilike.%${searchQuery}%,client.full_name.ilike.%${searchQuery}%,tutor.full_name.ilike.%${searchQuery}%`);
      }

      // Apply status filter
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter
      if (dateFilter) {
        const now = new Date();
        let startDate: Date;

        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            startDate = new Date(0);
        }

        query = query.gte('session_start_time', startDate.toISOString());
      }

      // Apply advanced filters
      if (advancedFilters.bookingType) {
        query = query.eq('booking_type', advancedFilters.bookingType);
      }

      if (advancedFilters.client) {
        query = query.eq('client_id', advancedFilters.client);
      }

      if (advancedFilters.agent) {
        query = query.eq('agent_id', advancedFilters.agent);
      }

      if (advancedFilters.tutor) {
        query = query.eq('tutor_id', advancedFilters.tutor);
      }

      if (advancedFilters.amountMin) {
        const minValue = parseFloat(advancedFilters.amountMin);
        if (!isNaN(minValue)) {
          query = query.gte('amount', minValue);
        }
      }

      if (advancedFilters.amountMax) {
        const maxValue = parseFloat(advancedFilters.amountMax);
        if (!isNaN(maxValue)) {
          query = query.lte('amount', maxValue);
        }
      }

      // Apply sorting
      query = query.order(sortKey, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch bookings:', error);
        throw error;
      }

      // Transform Supabase data to match Booking type
      const bookings = (data || []).map((item: any) => ({
        ...item,
        client: Array.isArray(item.client) ? item.client[0] : item.client,
        tutor: Array.isArray(item.tutor) ? item.tutor[0] : item.tutor,
        agent: Array.isArray(item.agent) ? item.agent[0] : item.agent,
      })) as Booking[];

      return {
        bookings,
        total: count || 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });

  // Quick actions handlers
  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (confirm(`Are you sure you want to cancel this booking?\n\nService: ${booking.service_name}\nClient: ${booking.client?.full_name}`)) {
      // TODO: Implement cancel booking
      console.log('Cancel booking:', booking.id);
      alert('Cancel booking functionality coming soon');
      setOpenMenuId(null);
    }
  };

  const handleRefundBooking = async (booking: Booking) => {
    if (confirm(`Are you sure you want to issue a refund?\n\nAmount: £${booking.amount.toFixed(2)}\nClient: ${booking.client?.full_name}`)) {
      // TODO: Implement refund booking
      console.log('Refund booking:', booking.id);
      alert('Refund functionality coming soon');
      setOpenMenuId(null);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (confirm(`Are you sure you want to DELETE this booking? This action cannot be undone.\n\nService: ${booking.service_name}\nClient: ${booking.client?.full_name}`)) {
      // TODO: Implement delete booking
      console.log('Delete booking:', booking.id);
      alert('Delete booking functionality coming soon');
      setOpenMenuId(null);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.actionsMenu')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Column configuration
  const columns: Column<Booking>[] = [
    {
      key: 'session_start_time',
      label: 'Date',
      width: '140px',
      sortable: true,
      render: (booking) => {
        const date = new Date(booking.session_start_time);
        return (
          <div className={styles.dateCell}>
            <div className={styles.date}>
              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className={styles.time}>
              {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'service_name',
      label: 'Service',
      width: '200px',
      sortable: true,
      render: (booking) => (
        <div className={styles.serviceCell}>
          <div className={styles.serviceName}>{booking.service_name}</div>
          {booking.subjects && booking.subjects.length > 0 && (
            <div className={styles.subjects}>{booking.subjects.slice(0, 2).join(', ')}</div>
          )}
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      width: '150px',
      render: (booking) => booking.client?.full_name || 'N/A',
    },
    {
      key: 'agent',
      label: 'Agent',
      width: '150px',
      render: (booking) => {
        if (!booking.agent_id || !booking.agent) {
          return <span className={styles.noAgent}>—</span>;
        }
        const commissionRate = booking.booking_type === 'agent_job' ? '20%' : '10%';
        return (
          <div className={styles.agentCell} title={`Commission: ${commissionRate}`}>
            {booking.agent.full_name}
          </div>
        );
      },
    },
    {
      key: 'tutor',
      label: 'Tutor',
      width: '150px',
      render: (booking) => booking.tutor?.full_name || 'N/A',
    },
    {
      key: 'amount',
      label: 'Amount',
      width: '100px',
      sortable: true,
      render: (booking) => `£${booking.amount.toFixed(2)}`,
    },
    {
      key: 'session_duration',
      label: 'Duration',
      width: '90px',
      render: (booking) => `${booking.session_duration} min`,
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      sortable: true,
      render: (booking) => <StatusBadge status={booking.status} />,
    },
    {
      key: 'payment_status',
      label: 'Payment',
      width: '110px',
      sortable: true,
      render: (booking) => <PaymentBadge status={booking.payment_status} />,
    },
    {
      key: 'booking_type',
      label: 'Type',
      width: '100px',
      render: (booking) => {
        const typeMap: Record<string, string> = {
          direct: 'Direct',
          referred: 'Referred',
          agent_job: 'Agent Job',
        };
        return typeMap[booking.booking_type || ''] || 'N/A';
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (booking) => (
        <div className={styles.actionsCell}>
          <button
            className={styles.actionsButton}
            onClick={(e) => {
              e.stopPropagation();
              const button = e.currentTarget;
              const rect = button.getBoundingClientRect();

              if (openMenuId === booking.id) {
                setOpenMenuId(null);
                setMenuPosition(null);
              } else {
                setOpenMenuId(booking.id);
                // Position menu below the button, aligned to the right
                setMenuPosition({
                  top: rect.bottom + 4,
                  left: rect.right - 160, // 160px is menu width
                });
              }
            }}
            aria-label="More actions"
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === booking.id && menuPosition && (
            <div
              className={`${styles.actionsMenu} actionsMenu`}
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              <button
                className={styles.actionMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(booking);
                }}
              >
                View Details
              </button>
              {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
                <button
                  className={styles.actionMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelBooking(booking);
                  }}
                >
                  Cancel Booking
                </button>
              )}
              {booking.payment_status === 'Paid' && booking.status !== 'Cancelled' && (
                <button
                  className={styles.actionMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefundBooking(booking);
                  }}
                >
                  Issue Refund
                </button>
              )}
              <button
                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBooking(booking);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Filter configuration
  const filters: Filter[] = [
    {
      key: 'status',
      label: 'All Statuses',
      options: [
        { label: 'Pending', value: 'Pending' },
        { label: 'Confirmed', value: 'Confirmed' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Cancelled', value: 'Cancelled' },
      ],
    },
    {
      key: 'date',
      label: 'All Time',
      options: [
        { label: 'Today', value: 'today' },
        { label: 'This Week', value: 'week' },
        { label: 'This Month', value: 'month' },
        { label: 'This Year', value: 'year' },
      ],
    },
  ];

  // Pagination configuration
  const pagination: PaginationConfig = {
    page,
    limit,
    total: bookingsData?.total || 0,
    onPageChange: setPage,
    onLimitChange: (newLimit) => {
      setLimit(newLimit);
      setPage(1); // Reset to first page when changing page size
    },
    pageSizeOptions: [10, 20, 50, 100],
  };

  // Handle sort
  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
    setPage(1); // Reset to first page on sort
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page on search
  };

  // Handle filter
  const handleFilterChange = (filterKey: string, value: string | string[]) => {
    // For now, we only support single-select filters, so we'll take the first value if it's an array
    const stringValue = Array.isArray(value) ? value[0] || '' : value;

    if (filterKey === 'status') {
      setStatusFilter(stringValue);
    } else if (filterKey === 'date') {
      setDateFilter(stringValue);
    }
    setPage(1); // Reset to first page on filter
  };

  // Advanced filter handlers
  const handleClearFilters = () => {
    setAdvancedFilters({
      bookingType: '',
      client: '',
      agent: '',
      tutor: '',
      amountMin: '',
      amountMax: '',
    });
    setPage(1);
  };

  const hasActiveFilters = Object.values(advancedFilters).some(value => value !== '');
  const activeFilterCount = Object.values(advancedFilters).filter(value => value !== '').length;

  // Handle export to CSV
  const handleExport = () => {
    if (!bookingsData?.bookings) return;

    // Create CSV header
    const headers = [
      'Date',
      'Time',
      'Service',
      'Client',
      'Tutor',
      'Amount',
      'Duration',
      'Status',
      'Payment',
      'Type',
      'ID',
    ];

    // Create CSV rows
    const rows = bookingsData.bookings.map((booking) => {
      const date = new Date(booking.session_start_time);
      return [
        date.toLocaleDateString('en-GB'),
        date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        booking.service_name,
        booking.client?.full_name || 'N/A',
        booking.tutor?.full_name || 'N/A',
        booking.amount.toFixed(2),
        booking.session_duration,
        booking.status,
        booking.payment_status,
        booking.booking_type || 'N/A',
        booking.id,
      ];
    });

    // Combine headers and rows
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle row click - open detail modal
  const handleRowClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  // Phase 2: Bulk actions handlers
  const handleBulkApprove = async (selectedIds: string[]) => {
    console.log('Bulk approve:', selectedIds);
    // TODO: Implement bulk approve
    // Update booking status to 'Confirmed'
    alert(`Approving ${selectedIds.length} bookings (not yet implemented)`);
  };

  const handleBulkCancel = async (selectedIds: string[]) => {
    console.log('Bulk cancel:', selectedIds);
    // TODO: Implement bulk cancel
    // Update booking status to 'Cancelled'
    if (confirm(`Are you sure you want to cancel ${selectedIds.length} bookings?`)) {
      alert(`Cancelling ${selectedIds.length} bookings (not yet implemented)`);
    }
  };

  const handleBulkExport = async (selectedIds: string[]) => {
    const selectedBookings = bookingsData?.bookings.filter(b => selectedIds.includes(b.id)) || [];

    const headers = ['Date', 'Time', 'Service', 'Client', 'Tutor', 'Amount', 'Status', 'ID'];
    const rows = selectedBookings.map((booking) => {
      const date = new Date(booking.session_start_time);
      return [
        date.toLocaleDateString('en-GB'),
        date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        booking.service_name,
        booking.client?.full_name || 'N/A',
        booking.tutor?.full_name || 'N/A',
        booking.amount.toFixed(2),
        booking.status,
        booking.id,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Phase 2: Bulk actions configuration
  const bulkActions: BulkAction[] = [
    {
      label: 'Approve Selected',
      value: 'approve',
      onClick: handleBulkApprove,
      variant: 'primary',
    },
    {
      label: 'Export Selected',
      value: 'export',
      onClick: handleBulkExport,
      variant: 'secondary',
    },
    {
      label: 'Cancel Selected',
      value: 'cancel',
      onClick: handleBulkCancel,
      variant: 'danger',
    },
  ];

  // Mobile card renderer
  const renderMobileCard = (booking: Booking) => (
    <BookingCard
      booking={booking}
      viewMode="client"
      isOnline={booking.location_type === 'online'}
    />
  );

  return (
    <>
      {/* Advanced Filters Drawer */}
      <AdvancedFiltersDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={advancedFilters}
        onFiltersChange={(newFilters) => {
          setAdvancedFilters(newFilters);
          setPage(1); // Reset to first page when filters change
        }}
        filterOptions={filterOptionsData}
      />

      <HubDataTable
        columns={columns}
        data={bookingsData?.bookings || []}
        loading={isLoading}
        error={error ? 'Failed to load bookings. Please try again.' : undefined}
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={(booking) => booking.id}
        onRowClick={handleRowClick}
        onSort={handleSort}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onExport={handleExport}
        onRefresh={() => refetch()}
        pagination={pagination}
        filters={filters}
        bulkActions={bulkActions}
        autoRefreshInterval={30000}
        enableSavedViews={true}
        savedViewsKey="admin_bookings_savedViews"
        searchPlaceholder="Search by ID, service, client, or tutor..."
        emptyMessage="No bookings found"
        mobileCard={renderMobileCard}
        toolbarActions={
          <button
            className={`${styles.filtersButton} ${hasActiveFilters ? styles.active : ''}`}
            onClick={() => setIsDrawerOpen(true)}
            title={hasActiveFilters ? `${activeFilterCount} filter(s) active` : 'Filters'}
          >
            <FilterIcon size={16} />
            {hasActiveFilters && (
              <span className={styles.filtersBadge}>
                {activeFilterCount}
              </span>
            )}
          </button>
        }
        className={styles.bookingsTable}
      />

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <AdminBookingDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          booking={selectedBooking}
        />
      )}
    </>
  );
}
