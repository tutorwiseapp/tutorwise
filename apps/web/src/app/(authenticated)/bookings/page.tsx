/*
 * Filename: src/app/(authenticated)/bookings/page.tsx
 * Purpose: Bookings hub page - displays user's bookings (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 4.1 - /bookings hub
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import BookingCard from '@/app/components/bookings/BookingCard';
import ContextualSidebar, { UpcomingSessionWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import { Booking } from '@/types';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

export default function BookingsPage() {
  const { profile, activeRole } = useUserProfile();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (!profile) return;

    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Determine role-aware query parameter
        const roleParam = activeRole === 'tutor' ? 'tutor' : 'student';

        const response = await fetch(`/api/bookings?role=${roleParam}`);

        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        setBookings(data.bookings || []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bookings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [profile, activeRole]);

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const sessionDate = new Date(booking.session_start_time);
    const now = new Date();

    if (filter === 'upcoming') {
      return sessionDate >= now && booking.status !== 'Cancelled';
    } else if (filter === 'past') {
      return sessionDate < now || booking.status === 'Completed';
    }
    return true; // 'all'
  });

  // Get next upcoming session for sidebar
  const nextSession = bookings
    .filter((b) => new Date(b.session_start_time) >= new Date() && b.status !== 'Cancelled')
    .sort((a, b) => new Date(a.session_start_time).getTime() - new Date(b.session_start_time).getTime())[0];

  const handlePayNow = async (bookingId: string) => {
    try {
      // Call Stripe checkout endpoint
      const response = await fetch('/api/stripe/create-booking-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe checkout
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Error initiating payment:', err);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  const handleViewDetails = (bookingId: string) => {
    router.push(`/bookings/${bookingId}`);
  };

  // Determine viewMode based on activeRole
  const viewMode = activeRole === 'tutor' ? 'tutor' : 'student';

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading bookings...</div>
      </div>
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

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <button
            onClick={() => setFilter('all')}
            className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
          >
            All Bookings
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`${styles.filterTab} ${filter === 'upcoming' ? styles.filterTabActive : ''}`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`${styles.filterTab} ${filter === 'past' ? styles.filterTabActive : ''}`}
          >
            Past
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!error && filteredBookings.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📅</div>
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
        {!error && filteredBookings.length > 0 && (
          <div className={styles.bookingsList}>
            {filteredBookings.map((booking) => (
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

      {/* Contextual Sidebar (Right Column) */}
      {nextSession && (
        <ContextualSidebar>
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
              viewMode === 'student'
                ? nextSession.tutor?.full_name || 'Unknown'
                : nextSession.student?.full_name || 'Unknown'
            }
          />
        </ContextualSidebar>
      )}
    </>
  );
}
