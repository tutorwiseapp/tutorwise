/*
 * Filename: src/app/components/feature/bookings/BookingCard.tsx
 * Purpose: Display booking information in card format (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-22 - Migrated to HubRowCard standard with full action buttons
 * Specification: SDD v3.6, Section 4.1 - /bookings hub UI
 * Design: Uses HubRowCard component for consistent visual layout
 */
'use client';

import Link from 'next/link';
import { Booking, BookingStatus, PaymentStatus } from '@/types';
import Button from '@/app/components/ui/actions/Button';
import HubRowCard from '@/app/components/hub/content/HubRowCard/HubRowCard';
import StatsRow from '@/app/components/hub/content/HubRowCard/StatsRow';
import getProfileImageUrl from '@/lib/utils/image';

interface BookingCardProps {
  booking: Booking;
  viewMode: 'client' | 'tutor'; // Role-aware display
  isOnline?: boolean; // Whether the session is online (for Join WiseSpace button)
  onPayNow?: (bookingId: string) => void;
  onViewDetails?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
  onCancel?: (bookingId: string) => void;
}

export default function BookingCard({
  booking,
  viewMode,
  isOnline = true, // Default to true for online sessions
  onPayNow,
  onViewDetails,
  onReschedule,
  onCancel,
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

  // Map booking status to HubRowCard status variant
  const getStatusVariant = (status: BookingStatus): 'success' | 'warning' | 'error' | 'neutral' => {
    switch (status) {
      case 'Confirmed':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Cancelled':
        return 'error';
      case 'Completed':
      default:
        return 'neutral';
    }
  };

  // Determine who the "other party" is based on view mode
  const otherParty = viewMode === 'client' ? booking.tutor : booking.client;

  // Get avatar URL with fallback
  const avatarUrl = otherParty ? getProfileImageUrl(otherParty) : null;
  const fallbackChar = otherParty?.full_name?.substring(0, 1).toUpperCase() || '?';

  // Build description with role prefix
  const rolePrefix = viewMode === 'client' ? 'Tutor' : 'Client';
  const description = otherParty ? `${rolePrefix}: ${otherParty.full_name}` : undefined;

  // Build metadata array with only date, time, and duration
  const metadata = [
    formattedDate,
    formattedTime,
    `${booking.session_duration} mins`,
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
    </>
  );

  return (
    <HubRowCard
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
      meta={metadata}
      stats={
        <StatsRow
          stats={[
            { value: `£${booking.amount.toFixed(2)}`, hideLabel: true },
            // Future: Add more stats here
            // { label: 'Duration', value: `${booking.session_duration}min` },
            // { label: 'Status', value: booking.payment_status },
          ]}
        />
      }
      actions={actions}
      imageHref={otherParty?.id ? `/public-profile/${otherParty.id}` : undefined}
      titleHref={`/bookings/${booking.id}`}
    />
  );
}
