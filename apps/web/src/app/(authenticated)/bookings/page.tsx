/*
 * Filename: src/app/(authenticated)/bookings/page.tsx
 * Purpose: Bookings hub page - displays user's bookings (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-08 - Refactored to use React Query for robust data fetching
 * Specification: SDD v3.6, Section 4.1 - /bookings hub, Section 2.0 - Server-side filtering via URL params
 */
'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyBookings, cancelBooking } from '@/lib/api/bookings';
import BookingCard from '@/app/components/bookings/BookingCard';
import ContextualSidebar, { UpcomingSessionWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import BookingStatsWidget from '@/app/components/bookings/BookingStatsWidget';
import BookingsSkeleton from '@/app/components/bookings/BookingsSkeleton';
import BookingsError from '@/app/components/bookings/BookingsError';
import toast from 'react-hot-toast';
import styles from './page.module.css';

type FilterType = 'all' | 'upcoming' | 'past';

export default function BookingsPage() {
  const { profile, activeRole, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Read filter from URL (SDD v3.6: URL is single source of truth)
  const filter = (searchParams?.get('filter') as FilterType) || 'all';

  // Determine role for API query
  const roleParam = activeRole === 'tutor' ? 'tutor' : 'client';

  // React Query: Fetch bookings with automatic retry, caching, and background refetch
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bookings', profile?.id, roleParam],
    queryFn: () => getMyBookings(roleParam),
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
      await queryClient.cancelQueries({ queryKey: ['bookings', profile?.id, roleParam] });
      const previousBookings = queryClient.getQueryData(['bookings', profile?.id, roleParam]);

      queryClient.setQueryData(['bookings', profile?.id, roleParam], (old: any[] = []) =>
        old.map((b) => (b.id === id ? { ...b, status: 'Cancelled' } : b))
      );

      return { previousBookings };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['bookings', profile?.id, roleParam], context?.previousBookings);
      toast.error('Failed to cancel booking');
    },
    onSuccess: () => {
      toast.success('Booking cancelled successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', profile?.id, roleParam] });
    },
  });

  // Filter bookings based on URL param
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking: any) => {
      const sessionDate = new Date(booking.session_start_time);
      const now = new Date();

      if (filter === 'upcoming') {
        return sessionDate >= now && booking.status !== 'Cancelled';
      } else if (filter === 'past') {
        return sessionDate < now || booking.status === 'Completed';
      }
      return true; // 'all'
    });
  }, [bookings, filter]);

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

  const handleViewDetails = (bookingId: string) => {
    router.push(`/bookings/${bookingId}`);
  };

  const handleCancel = (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    cancelMutation.mutate(bookingId);
  };

  // Determine viewMode based on activeRole
  const viewMode = activeRole === 'tutor' ? 'tutor' : 'client';

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <>
        <BookingsSkeleton />
        <ContextualSidebar>
          <BookingStatsWidget pending={0} upcoming={0} completed={0} />
        </ContextualSidebar>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <BookingsError error={error as Error} onRetry={() => refetch()} />
        <ContextualSidebar>
          <BookingStatsWidget pending={0} upcoming={0} completed={0} />
        </ContextualSidebar>
      </>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Bookings</h1>
          <p className={styles.subtitle}>
            Manage your tutoring sessions and upcoming appointments
          </p>
        </div>
      </div>

      {/* Filter Tabs - Full width outside container */}
      <div className={styles.filterTabs}>
          <button
            onClick={() => handleFilterChange('all')}
            className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
          >
            All Bookings
          </button>
          <button
            onClick={() => handleFilterChange('upcoming')}
            className={`${styles.filterTab} ${filter === 'upcoming' ? styles.filterTabActive : ''}`}
          >
            Upcoming
          </button>
          <button
            onClick={() => handleFilterChange('past')}
            className={`${styles.filterTab} ${filter === 'past' ? styles.filterTabActive : ''}`}
          >
            Past
          </button>
      </div>

      {/* Content container */}
      <div className={styles.container}>
        {/* Empty State */}
        {filteredBookings.length === 0 && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No bookings found</h3>
            <p className={styles.emptyText}>
              {filter === 'upcoming'
                ? 'You have no upcoming sessions scheduled.'
                : filter === 'past'
                ? 'You have no past sessions.'
                : 'You have no bookings yet.'}
            </p>
            {activeRole === 'client' && (
              <button
                onClick={() => router.push('/marketplace')}
                className={styles.emptyButton}
              >
                Browse Marketplace
              </button>
            )}
          </div>
        )}

        {/* Bookings List */}
        {filteredBookings.length > 0 && (
          <div className={styles.bookingsList}>
            {filteredBookings.map((booking: any) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                viewMode={viewMode}
                onPayNow={activeRole === 'client' ? handlePayNow : undefined}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contextual Sidebar (Right Column) - Always visible */}
      <ContextualSidebar>
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
          upcoming={bookings.filter((b: any) => new Date(b.session_start_time) >= new Date() && b.status !== 'Cancelled').length}
          completed={bookings.filter((b: any) => b.status === 'Completed').length}
        />
      </ContextualSidebar>
    </>
  );
}
