/**
 * Filename: page.tsx
 * Purpose: Booking detail page
 * Path: /bookings/[id]
 * Created: 2025-11-17
 */

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Calendar, User, CreditCard, FileText } from 'lucide-react';
import { getBookingById } from '@/lib/api/bookings';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Image from 'next/image';
import getProfileImageUrl from '@/lib/utils/image';
import Button from '@/app/components/ui/actions/Button';
import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import BookingHelpWidget from '@/app/components/feature/bookings/BookingHelpWidget';
import BookingTipWidget from '@/app/components/feature/bookings/BookingTipWidget';
import BookingVideoWidget from '@/app/components/feature/bookings/BookingVideoWidget';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import styles from './page.module.css';

interface PageProps {
  params: { id: string };
}

export default function BookingDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { profile, activeRole } = useUserProfile();

  // Fetch booking with full details
  const {
    data: booking,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['booking', params.id],
    queryFn: () => getBookingById(params.id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Determine view mode
  const viewMode = activeRole === 'tutor' ? 'tutor' : 'client';

  // Get the "other party" (tutor for client view, client for tutor view)
  const otherParty = viewMode === 'client' ? booking?.tutor : booking?.client;

  // Format date/time
  const sessionDate = booking ? new Date(booking.session_start_time) : null;
  const formattedDate = sessionDate?.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = sessionDate?.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Get status badge class
  const getStatusClass = (status: string) => {
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

  const getPaymentStatusClass = (status: string) => {
    switch (status) {
      case 'Paid':
        return styles.paymentPaid;
      case 'Failed':
        return styles.paymentFailed;
      case 'Refunded':
        return styles.paymentRefunded;
      case 'Pending':
      default:
        return styles.paymentPending;
    }
  };

  // Get status variant for HubDetailCard badges
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
    switch (status) {
      case 'Confirmed':
        return 'info';
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'error';
      case 'Pending':
      default:
        return 'warning';
    }
  };

  const getPaymentStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Failed':
        return 'error';
      case 'Refunded':
        return 'info';
      case 'Pending':
      default:
        return 'warning';
    }
  };

  // Get initials for fallback avatar
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Booking Details" className={styles.bookingDetailHeader} />}
        sidebar={
          <HubSidebar>
            <BookingHelpWidget />
            <BookingTipWidget />
            <BookingVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading booking details...</div>
      </HubPageLayout>
    );
  }

  if (error || !booking) {
    return (
      <HubPageLayout
        header={<HubHeader title="Booking Not Found" className={styles.bookingDetailHeader} />}
        sidebar={
          <HubSidebar>
            <BookingHelpWidget />
            <BookingTipWidget />
            <BookingVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.error}>
          <h2>Booking Not Found</h2>
          <p>The booking you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
          <Button onClick={() => router.push('/bookings')} variant="primary">
            Back to Bookings
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title={booking.service_name}
          className={styles.bookingDetailHeader}
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/bookings')}
              >
                ← Back
              </Button>
              <Button
                onClick={() => router.push(`/wisespace/${booking.id}`)}
                variant="primary"
                size="sm"
                disabled={booking.status !== 'Confirmed'}
              >
                Join WiseSpace
              </Button>
              {viewMode === 'client' && (
                <Button
                  onClick={async () => {
                    const response = await fetch('/api/stripe/create-booking-checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ booking_id: booking.id }),
                    });
                    const { url } = await response.json();
                    if (url) window.location.href = url;
                  }}
                  variant="primary"
                  size="sm"
                  disabled={booking.payment_status !== 'Pending'}
                >
                  Pay Now
                </Button>
              )}
            </>
          }
        />
      }
      sidebar={
        <HubSidebar>
          <BookingHelpWidget />
          <BookingTipWidget />
          <BookingVideoWidget />
        </HubSidebar>
      }
    >
      {/* Horizontal divider for visual separation */}
      <div className={styles.headerDivider}></div>

      {/* Status badges info card */}
      <div className={styles.infoCard}>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${getStatusClass(booking.status)}`}>
            {booking.status}
          </span>
          <span className={`${styles.badge} ${getPaymentStatusClass(booking.payment_status)}`}>
            {booking.payment_status}
          </span>
        </div>
      </div>

      {/* NEW: HubDetailCard for comparison */}
      {otherParty && (
        <HubDetailCard
          image={{
            src: getProfileImageUrl(otherParty),
            alt: otherParty.full_name || 'User',
            fallbackChar: getInitials(otherParty.full_name),
          }}
          imageHref={`/public-profile/${otherParty.id}`}
          title={booking.service_name}
          titleHref={booking.listing_id ? `/listings/${booking.listing_id}` : undefined}
          status={{
            label: booking.status,
            variant: getStatusVariant(booking.status),
          }}
          description={`${formattedDate} at ${formattedTime}`}
          details={[
            { label: 'Duration', value: `${booking.session_duration} minutes` },
            { label: 'Amount', value: `£${booking.amount.toFixed(2)}` },
            { label: 'Payment Status', value: booking.payment_status },
            { label: 'Booking Type', value: booking.booking_type === 'direct' ? 'Direct Booking' : booking.booking_type === 'referred' ? 'Referred Booking' : 'Agent Job' },
            { label: 'Booking ID', value: booking.id },
            { label: 'Created', value: new Date(booking.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) },
            ...(booking.agent ? [{ label: 'Agent', value: booking.agent.full_name }] : []),
          ]}
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/public-profile/${otherParty.id}`)}
              >
                View Profile
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/messages?user=${otherParty.id}`)}
              >
                Message
              </Button>
            </>
          }
        />
      )}

      <div style={{ height: '2rem' }}></div>

          {/* ORIGINAL: Main details grid */}
          <div className={styles.detailsGrid}>
            {/* Participant card */}
            {otherParty && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <User size={20} />
                  <h3 className={styles.cardTitle}>
                    {viewMode === 'client' ? 'Tutor' : 'Client'}
                  </h3>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.participantInfo}>
                    <Image
                      src={getProfileImageUrl(otherParty)}
                      alt={otherParty.full_name || 'User'}
                      width={64}
                      height={64}
                      className={styles.participantAvatar}
                    />
                    <div>
                      <p className={styles.participantName}>{otherParty.full_name}</p>
                      <Button
                        onClick={() => router.push(`/public-profile/${otherParty.id}`)}
                        variant="secondary"
                        size="sm"
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Session details card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <Calendar size={20} />
                <h3 className={styles.cardTitle}>Session Details</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Date</span>
                  <span className={styles.detailValue}>{formattedDate}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Time</span>
                  <span className={styles.detailValue}>{formattedTime}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Duration</span>
                  <span className={styles.detailValue}>{booking.session_duration} minutes</span>
                </div>
              </div>
            </div>

            {/* Payment details card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <CreditCard size={20} />
                <h3 className={styles.cardTitle}>Payment Details</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValue}>£{booking.amount.toFixed(2)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Payment Status</span>
                  <span className={`${styles.badge} ${getPaymentStatusClass(booking.payment_status)}`}>
                    {booking.payment_status}
                  </span>
                </div>
                {booking.booking_type && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Booking Type</span>
                    <span className={styles.detailValue}>
                      {booking.booking_type === 'direct' && 'Direct Booking'}
                      {booking.booking_type === 'referred' && 'Referred Booking'}
                      {booking.booking_type === 'agent_job' && 'Agent Job'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Additional info card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <FileText size={20} />
                <h3 className={styles.cardTitle}>Additional Information</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Booking ID</span>
                  <span className={styles.detailValue}>{booking.id}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Created</span>
                  <span className={styles.detailValue}>
                    {new Date(booking.created_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {booking.agent && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Agent</span>
                    <span className={styles.detailValue}>{booking.agent.full_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
    </HubPageLayout>
  );
}
