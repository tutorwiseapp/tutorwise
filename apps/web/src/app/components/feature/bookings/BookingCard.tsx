/*
 * Filename: src/app/components/feature/bookings/BookingCard.tsx
 * Purpose: Display booking information in detail card format with HubDetailCard
 * Created: 2025-11-02
 * Updated: 2025-12-05 - Migrated to HubDetailCard standard (consistent with WiselistCard)
 * Specification: Expanded detail card layout with HubDetailCard component
 * Design: Uses HubDetailCard component for consistent visual layout across all hubs
 */
'use client';

import Link from 'next/link';
import { Booking, BookingStatus } from '@/types';
import Button from '@/app/components/ui/actions/Button';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import getProfileImageUrl from '@/lib/utils/image';

interface BookingCardProps {
  booking: Booking;
  viewMode: 'client' | 'tutor'; // Role-aware display
  isOnline?: boolean; // Whether the session is online (for Join WiseSpace button)
  onPayNow?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
  onCancel?: (bookingId: string) => void;
}

export default function BookingCard({
  booking,
  viewMode,
  isOnline = true, // Default to true for online sessions
  onPayNow,
  onReschedule,
  onCancel,
}: BookingCardProps) {
  // Format date/time
  const sessionDate = new Date(booking.session_start_time);
  const formattedTime = sessionDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Map booking status to status variant
  const getStatusVariant = (status: BookingStatus): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
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

  // Determine who the "other party" is based on view mode
  const otherParty = viewMode === 'client' ? booking.tutor : booking.client;

  // Get avatar URL with fallback
  const avatarUrl = otherParty ? getProfileImageUrl(otherParty) : null;
  const fallbackChar = otherParty?.full_name?.substring(0, 2).toUpperCase() || '?';

  // Build description with role prefix
  const rolePrefix = viewMode === 'client' ? 'Tutor' : 'Client';
  const description = otherParty ? `${rolePrefix}: ${otherParty.full_name}` : undefined;

  // Build details grid - 3x3 grid matching design
  const details = [
    // Row 1: Date, Time, Duration
    {
      label: 'Date',
      value: sessionDate.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    },
    { label: 'Time', value: formattedTime },
    { label: 'Duration', value: `${booking.session_duration} mins` },
    // Row 2: Amount, Payment, Status
    { label: 'Amount', value: `£${booking.amount.toFixed(2)}` },
    { label: 'Payment', value: booking.payment_status },
    { label: 'Status', value: booking.status },
    // Row 3: Type, Created, ID (truncated)
    {
      label: 'Type',
      value: booking.booking_type === 'direct' ? 'Direct' : booking.booking_type === 'referred' ? 'Referred' : 'Agent Job'
    },
    {
      label: 'Created',
      value: formatDate(booking.created_at)
    },
    {
      label: 'ID',
      value: (
        <span
          title={booking.id}
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'help'
          }}
        >
          {booking.id}
        </span>
      )
    },
  ];

  // Determine if Join WiseSpace button should be enabled
  const canJoinWiseSpace = booking.status === 'Confirmed' && isOnline;

  // Build actions
  const actions = (
    <>
      {/* Join WiseSpace: Always shown, disabled if not Confirmed or not online */}
      <Link
        href={canJoinWiseSpace ? `/wisespace/${booking.id}` : '#'}
        target={canJoinWiseSpace ? '_blank' : undefined}
        onClick={(e) => {
          if (!canJoinWiseSpace) {
            e.preventDefault();
          }
        }}
      >
        <Button
          variant="primary"
          size="sm"
          disabled={!canJoinWiseSpace}
        >
          Join WiseSpace
        </Button>
      </Link>

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

      {/* Reschedule button - only if handler provided */}
      {onReschedule && (
        <Button
          onClick={() => onReschedule(booking.id)}
          variant="secondary"
          size="sm"
        >
          Reschedule
        </Button>
      )}

      {/* Cancel button - only if handler provided */}
      {onCancel && (
        <Button
          onClick={() => onCancel(booking.id)}
          variant="secondary"
          size="sm"
        >
          Cancel
        </Button>
      )}
    </>
  );

  return (
    <HubDetailCard
      image={{
        src: avatarUrl,
        alt: otherParty?.full_name || 'User',
        fallbackChar: fallbackChar,
      }}
      title={booking.service_name}
      status={{
        label: booking.status,
        variant: getStatusVariant(booking.status),
      }}
      description={description}
      details={details}
      actions={actions}
      imageHref={otherParty?.id ? `/public-profile/${otherParty.id}` : undefined}
    />
  );
}
