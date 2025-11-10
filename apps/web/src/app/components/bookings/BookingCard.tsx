/*
 * Filename: src/app/components/bookings/BookingCard.tsx
 * Purpose: Display booking information in card format (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-10 - Redesigned to match ListingCard with avatar on left
 * Specification: SDD v3.6, Section 4.1 - /bookings hub UI
 * Design: Clean white card with avatar, 14px base font, 8px button gap
 */
'use client';

import Image from 'next/image';
import { Booking, BookingStatus, PaymentStatus } from '@/types';
import Button from '@/app/components/ui/Button';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './BookingCard.module.css';

interface BookingCardProps {
  booking: Booking;
  viewMode: 'client' | 'tutor'; // Role-aware display
  onPayNow?: (bookingId: string) => void;
  onViewDetails?: (bookingId: string) => void;
}

export default function BookingCard({
  booking,
  viewMode,
  onPayNow,
  onViewDetails,
}: BookingCardProps) {
  // Format date/time
  const sessionDate = new Date(booking.session_start_time);
  const formattedDate = sessionDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = sessionDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Get status CSS class
  const getStatusClass = (status: BookingStatus) => {
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

  const getPaymentStatusClass = (status: PaymentStatus) => {
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

  // Determine who the "other party" is based on view mode (migration 049: student → client)
  const otherParty = viewMode === 'client' ? booking.tutor : booking.client;

  // Get avatar URL
  const avatarUrl = otherParty ? getProfileImageUrl(otherParty) : getProfileImageUrl({});

  return (
    <div className={styles.card}>
      <div className={styles.cardContent}>
        {/* Avatar Section - Left Side */}
        <div className={styles.avatarSection}>
          <Image
            src={avatarUrl}
            alt={otherParty?.full_name || 'User'}
            width={60}
            height={60}
            className={styles.avatar}
          />
        </div>

        {/* Main Content - Right Side */}
        <div className={styles.mainContent}>
          {/* Header: Service Name + Status Badges */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h3 className={styles.serviceName}>
                {booking.service_name}
              </h3>
              {otherParty && (
                <p className={styles.participantInfo}>
                  <span className={styles.participantLabel}>
                    {viewMode === 'client' ? 'Tutor: ' : 'Client: '}
                  </span>
                  <span className={styles.participantName}>
                    {otherParty.full_name}
                  </span>
                </p>
              )}
            </div>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${getStatusClass(booking.status)}`}>
                {booking.status}
              </span>
              <span className={`${styles.badge} ${getPaymentStatusClass(booking.payment_status)}`}>
                {booking.payment_status}
              </span>
            </div>
          </div>

          {/* Session Details */}
          <div className={styles.details}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Date:</span>
              <span className={styles.detailValue}>{formattedDate}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Time:</span>
              <span className={styles.detailValue}>{formattedTime}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Duration:</span>
              <span className={styles.detailValue}>
                {booking.session_duration} mins
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Amount:</span>
              <span className={styles.detailValue}>
                £{booking.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            {/* Client-specific: Show "Pay Now" if Pending */}
            {viewMode === 'client' &&
              booking.payment_status === 'Pending' &&
              onPayNow && (
                <Button
                  onClick={() => onPayNow(booking.id)}
                  variant="primary"
                  size="sm"
                >
                  Pay Now
                </Button>
              )}

            {/* Always show View Details */}
            {onViewDetails && (
              <Button
                onClick={() => onViewDetails(booking.id)}
                variant="secondary"
                size="sm"
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
