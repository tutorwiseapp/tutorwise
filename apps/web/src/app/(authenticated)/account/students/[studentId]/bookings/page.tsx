/**
 * Filename: apps/web/src/app/(authenticated)/account/students/[studentId]/bookings/page.tsx
 * Purpose: Student Bookings tab - View all bookings for this student (Guardian Link v5.0)
 * Created: 2026-02-08
 * Pattern: Filters bookings by student_id to show only this student's sessions
 */
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyBookings } from '@/lib/api/bookings';
import BookingCard from '@/app/components/feature/bookings/BookingCard';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountCard from '@/app/components/feature/account/AccountCard';
import AccountHelpWidget from '@/app/components/feature/account/AccountHelpWidget';
import { HubPageLayout, HubTabs, HubHeader } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import toast from 'react-hot-toast';
import styles from './page.module.css';

type FilterType = 'all' | 'upcoming' | 'past';

export default function StudentBookingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = params?.studentId as string;
  const { profile, activeRole } = useUserProfile();

  // Read filter from URL
  const filter = (searchParams?.get('filter') as FilterType) || 'all';

  // Fetch all bookings
  const {
    data: allBookings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bookings', profile?.id, activeRole],
    queryFn: () => getMyBookings(),
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Filter bookings by student_id
  const studentBookings = useMemo(() => {
    return allBookings.filter((booking: any) => booking.student_id === studentId);
  }, [allBookings, studentId]);

  // Filter bookings based on filter type
  const filteredBookings = useMemo(() => {
    let filtered = studentBookings;

    const now = new Date();
    if (filter === 'upcoming') {
      filtered = studentBookings.filter((booking: any) => {
        const sessionDate = new Date(booking.session_start_time);
        return sessionDate >= now && booking.status !== 'Cancelled';
      });
    } else if (filter === 'past') {
      filtered = studentBookings.filter((booking: any) => {
        const sessionDate = new Date(booking.session_start_time);
        return sessionDate < now || booking.status === 'Completed';
      });
    }

    // Sort by date descending
    return filtered.sort((a: any, b: any) =>
      new Date(b.session_start_time).getTime() - new Date(a.session_start_time).getTime()
    );
  }, [studentBookings, filter]);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      all: studentBookings.length,
      upcoming: studentBookings.filter((b: any) =>
        new Date(b.session_start_time) >= now && b.status !== 'Cancelled'
      ).length,
      past: studentBookings.filter((b: any) =>
        new Date(b.session_start_time) < now || b.status === 'Completed'
      ).length,
    };
  }, [studentBookings]);

  const tabs: HubTab[] = [
    { id: 'overview', label: 'Overview', active: false },
    { id: 'learning-preferences', label: 'Learning Preferences', active: false },
    { id: 'bookings', label: 'Bookings', count: tabCounts.all, active: true },
    { id: 'settings', label: 'Settings', active: false },
  ];

  const bookingFilterTabs: HubTab[] = [
    { id: 'all', label: 'All Bookings', count: tabCounts.all, active: filter === 'all' },
    { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming, active: filter === 'upcoming' },
    { id: 'past', label: 'Past', count: tabCounts.past, active: filter === 'past' },
  ];

  const handleTabChange = (tabId: string) => {
    router.push(`/account/students/${studentId}/${tabId}`);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }
    router.push(`/account/students/${studentId}/bookings${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const handleBackToStudents = () => {
    router.push('/account/students/my-students');
  };

  const handleBookSession = () => {
    router.push('/marketplace');
  };

  const handleReschedule = (_bookingId: string) => {
    toast('Reschedule functionality coming soon', { icon: 'ℹ️' });
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to cancel booking');

      toast.success('Booking cancelled successfully');
      refetch();
    } catch (_error) {
      toast.error('Failed to cancel booking');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Student Bookings" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <AccountCard />
            <AccountHelpWidget
              title="Student Bookings"
              description="View and manage all bookings for this student."
              tips={[
                'Track upcoming and past sessions',
                'Monitor session completion',
                'Review session feedback',
              ]}
            />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading bookings...</div>
      </HubPageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Student Bookings" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <AccountCard />
            <AccountHelpWidget
              title="Student Bookings"
              description="View and manage all bookings for this student."
              tips={[
                'Track upcoming and past sessions',
                'Monitor session completion',
                'Review session feedback',
              ]}
            />
          </HubSidebar>
        }
      >
        <div className={styles.error}>
          <p>Failed to load bookings</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Student Bookings"
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={handleBackToStudents}>
                ← Back to My Students
              </Button>
              <Button variant="primary" size="sm" onClick={handleBookSession}>
                Book Session
              </Button>
            </>
          }
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <AccountCard />
          <AccountHelpWidget
            title="Student Bookings"
            description="View and manage all bookings for this student."
            tips={[
              'Track upcoming and past sessions',
              'Monitor session completion',
              'Review session feedback',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Secondary Filter Tabs */}
      <div className={styles.filterTabs}>
        <HubTabs tabs={bookingFilterTabs} onTabChange={(tabId) => handleFilterChange(tabId as FilterType)} />
      </div>

      {/* Empty State */}
      {filteredBookings.length === 0 && (
        <HubEmptyState
          icon="📅"
          title={
            filter === 'upcoming' ? 'No Upcoming Bookings' :
            filter === 'past' ? 'No Past Bookings' :
            'No Bookings Yet'
          }
          description={
            studentBookings.length === 0
              ? 'Book your first session for this student to get started.'
              : 'Try selecting a different filter.'
          }
          actionLabel={studentBookings.length === 0 ? 'Book Session' : undefined}
          onAction={studentBookings.length === 0 ? handleBookSession : undefined}
        />
      )}

      {/* Bookings List */}
      {filteredBookings.length > 0 && (
        <div className={styles.bookingsList}>
          {filteredBookings.map((booking: any) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              viewMode="client"
              isOnline={booking.delivery_mode !== 'in_person'}
              onReschedule={handleReschedule}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </HubPageLayout>
  );
}
