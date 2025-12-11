/*
 * Filename: src/app/(authenticated)/bookings/page.tsx
 * Purpose: Bookings hub page - displays user's bookings (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-28 - Migrated to HubPageLayout with Gold Standard Hub Architecture
 * Specification: SDD v3.6, Section 4.1 - /bookings hub, Section 2.0 - Server-side filtering via URL params
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyBookings, cancelBooking } from '@/lib/api/bookings';
import BookingCard from '@/app/components/feature/bookings/BookingCard';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import UpcomingSessionWidget from '@/app/components/feature/bookings/UpcomingSessionWidget';
import BookingStatsWidget from '@/app/components/feature/bookings/BookingStatsWidget';
import BookingHelpWidget from '@/app/components/feature/bookings/BookingHelpWidget';
import BookingTipWidget from '@/app/components/feature/bookings/BookingTipWidget';
import BookingVideoWidget from '@/app/components/feature/bookings/BookingVideoWidget';
import BookingsSkeleton from '@/app/components/feature/bookings/BookingsSkeleton';
import BookingsError from '@/app/components/feature/bookings/BookingsError';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type FilterType = 'all' | 'upcoming' | 'past';
type SortType = 'date-desc' | 'date-asc' | 'status';

const ITEMS_PER_PAGE = 4;

export default function BookingsPage() {
  const { profile, activeRole, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('date-desc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Read filter from URL (SDD v3.6: URL is single source of truth)
  const filter = (searchParams?.get('filter') as FilterType) || 'all';

  // React Query: Fetch bookings with automatic retry, caching, and background refetch
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bookings', profile?.id, activeRole],
    queryFn: () => getMyBookings(),
    enabled: !!profile && !profileLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes (bookings change more frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['bookings', profile?.id, activeRole] });
      const previousBookings = queryClient.getQueryData(['bookings', profile?.id, activeRole]);

      queryClient.setQueryData(['bookings', profile?.id, activeRole], (old: any[] = []) =>
        old.map((b) => (b.id === id ? { ...b, status: 'Cancelled' } : b))
      );

      return { previousBookings };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['bookings', profile?.id, activeRole], context?.previousBookings);
      toast.error('Failed to cancel booking');
    },
    onSuccess: () => {
      toast.success('Booking cancelled successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', profile?.id, activeRole] });
    },
  });

  // Filter and sort bookings based on URL param, search, and sort
  const filteredBookings = useMemo(() => {
    let filtered = bookings.filter((booking: any) => {
      const sessionDate = new Date(booking.session_start_time);
      const now = new Date();

      if (filter === 'upcoming') {
        return sessionDate >= now && booking.status !== 'Cancelled';
      } else if (filter === 'past') {
        return sessionDate < now || booking.status === 'Completed';
      }
      return true; // 'all'
    });

    // Search filtering (by service name, tutor/client name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((booking: any) => {
        const serviceName = booking.service_name?.toLowerCase() || '';
        const tutorName = booking.tutor?.full_name?.toLowerCase() || '';
        const clientName = booking.client?.full_name?.toLowerCase() || '';
        return serviceName.includes(query) || tutorName.includes(query) || clientName.includes(query);
      });
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.session_start_time).getTime() - new Date(a.session_start_time).getTime();
        case 'date-asc':
          return new Date(a.session_start_time).getTime() - new Date(b.session_start_time).getTime();
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [bookings, filter, searchQuery, sortBy]);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      all: bookings.length,
      upcoming: bookings.filter((b: any) => new Date(b.session_start_time) >= now && b.status !== 'Cancelled').length,
      past: bookings.filter((b: any) => new Date(b.session_start_time) < now || b.status === 'Completed').length,
    };
  }, [bookings]);

  // Pagination logic
  const totalItems = filteredBookings.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Reset to page 1 when filter, search, or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, sortBy]);

  // Get next upcoming session for sidebar
  const nextSession = useMemo(() => {
    return bookings
      .filter((b: any) => new Date(b.session_start_time) >= new Date() && b.status !== 'Cancelled')
      .sort((a: any, b: any) => new Date(a.session_start_time).getTime() - new Date(b.session_start_time).getTime())[0];
  }, [bookings]);

  // Update URL when filter changes
  const handleFilterChange = (newFilter: FilterType) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }
    router.push(`/bookings${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const handlePayNow = async (bookingId: string) => {
    try {
      const response = await fetch('/api/stripe/create-booking-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Error initiating payment:', err);
      toast.error('Failed to initiate payment. Please try again.');
    }
  };


  const handleCancel = (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    cancelMutation.mutate(bookingId);
  };

  const handleReschedule = (bookingId: string) => {
    // TODO: Implement reschedule modal/flow
    toast('Reschedule functionality coming soon. Please contact support for now.', {
      icon: 'ℹ️',
    });
  };

  // Action handlers for header
  const handleNewBooking = () => {
    router.push('/marketplace');
    setShowActionsMenu(false);
  };

  const handleExportCSV = () => {
    if (!filteredBookings.length) {
      toast.error('No bookings to export');
      return;
    }

    const headers = ['Date', 'Time', 'Service', activeRole === 'tutor' ? 'Client' : 'Tutor', 'Status', 'Amount'];
    const rows = filteredBookings.map((b: any) => [
      new Date(b.session_start_time).toLocaleDateString('en-GB'),
      new Date(b.session_start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      b.service_name || '',
      activeRole === 'tutor' ? (b.client?.full_name || '') : (b.tutor?.full_name || ''),
      b.status || '',
      b.total_price ? `£${b.total_price.toFixed(2)}` : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Bookings exported successfully');
    setShowActionsMenu(false);
  };

  const handleSyncCalendar = () => {
    toast('Calendar sync functionality coming soon!', { icon: '📅' });
    setShowActionsMenu(false);
  };

  // Determine viewMode based on activeRole
  const viewMode = activeRole === 'tutor' ? 'tutor' : 'client';

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Bookings" />}
        sidebar={
          <HubSidebar>
            <BookingStatsWidget pending={0} upcoming={0} completed={0} />
            <BookingHelpWidget />
            <BookingTipWidget />
            <BookingVideoWidget />
          </HubSidebar>
        }
      >
        <BookingsSkeleton />
      </HubPageLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Bookings" />}
        sidebar={
          <HubSidebar>
            <BookingStatsWidget pending={0} upcoming={0} completed={0} />
            <BookingHelpWidget />
            <BookingTipWidget />
            <BookingVideoWidget />
          </HubSidebar>
        }
      >
        <BookingsError error={error as Error} onRetry={() => refetch()} />
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Bookings"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className={filterStyles.filterSelect}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="status">By Status</option>
              </select>
            </div>
          }
          actions={
            <>
              {/* Primary Action Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleNewBooking}
              >
                New Booking
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  square
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
                        onClick={handleSyncCalendar}
                        className={actionStyles.menuButton}
                      >
                        Sync Calendar
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
            { id: 'all', label: 'All Bookings', count: tabCounts.all, active: filter === 'all' },
            { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming, active: filter === 'upcoming' },
            { id: 'past', label: 'Past', count: tabCounts.past, active: filter === 'past' },
          ]}
          onTabChange={(tabId) => handleFilterChange(tabId as FilterType)}
        />
      }
      sidebar={
        <HubSidebar>
          {/* Show next session widget if there is an upcoming session */}
          {nextSession && (
            <UpcomingSessionWidget
              date={new Date(nextSession.session_start_time).toLocaleDateString('en-GB', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              time={new Date(nextSession.session_start_time).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              service={nextSession.service_name}
              participant={
                viewMode === 'client'
                  ? nextSession.tutor?.full_name || 'Unknown'
                  : nextSession.client?.full_name || 'Unknown'
              }
            />
          )}

          {/* Booking stats widget - always visible */}
          <BookingStatsWidget
            pending={bookings.filter((b: any) => b.status === 'Pending').length}
            upcoming={tabCounts.upcoming}
            completed={bookings.filter((b: any) => b.status === 'Completed').length}
          />

          {/* Help, Tip, and Video widgets */}
          <BookingHelpWidget />
          <BookingTipWidget />
          <BookingVideoWidget />
        </HubSidebar>
      }
    >
      {/* Empty State */}
      {paginatedBookings.length === 0 && (
        <HubEmptyState
          title="No bookings found"
          description={
            filter === 'upcoming'
              ? 'You have no upcoming sessions scheduled.'
              : filter === 'past'
              ? 'You have no past sessions.'
              : 'You have no bookings yet.'
          }
          actionLabel={activeRole === 'client' ? 'Browse Marketplace' : undefined}
          onAction={activeRole === 'client' ? () => router.push('/marketplace') : undefined}
        />
      )}

        {/* Bookings List */}
        {paginatedBookings.length > 0 && (
          <div className={styles.bookingsList}>
            {paginatedBookings.map((booking: any) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                viewMode={viewMode}
                isOnline={true} // TODO: Determine from booking.delivery_mode or listing settings
                onPayNow={activeRole === 'client' ? handlePayNow : undefined}
                onReschedule={handleReschedule}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}

      {/* Pagination */}
      <div className={styles.paginationContainer}>
        <HubPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </HubPageLayout>
  );
}
