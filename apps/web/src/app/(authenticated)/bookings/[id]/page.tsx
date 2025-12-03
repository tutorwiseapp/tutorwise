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
import { Calendar, User, CreditCard, FileText, ArrowLeft } from 'lucide-react';
import { getBookingById } from '@/lib/api/bookings';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Image from 'next/image';
import getProfileImageUrl from '@/lib/utils/image';
import Button from '@/app/components/ui/actions/Button';
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

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading booking details...</div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Booking Not Found</h2>
          <p>The booking you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
          <Button onClick={() => router.push('/bookings')} variant="primary">
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.mainContent}>
          {/* Back button */}
          <button onClick={() => router.push('/bookings')} className={styles.backButton}>
            <ArrowLeft size={20} />
            Back to Bookings
          </button>

          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>{booking.service_name}</h1>
              <div className={styles.badges}>
                <span className={`${styles.badge} ${getStatusClass(booking.status)}`}>
                  {booking.status}
                </span>
                <span className={`${styles.badge} ${getPaymentStatusClass(booking.payment_status)}`}>
                  {booking.payment_status}
                </span>
              </div>
            </div>
          </header>

          {/* Main details grid */}
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

          {/* Actions */}
          <div className={styles.actions}>
            {booking.status === 'Confirmed' && (
              <Button
                onClick={() => router.push(`/wisespace/${booking.id}`)}
                variant="primary"
              >
                Join WiseSpace
              </Button>
            )}
            {viewMode === 'client' && booking.payment_status === 'Pending' && (
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
              >
                Pay Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
