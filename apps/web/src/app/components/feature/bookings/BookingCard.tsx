/*
 * Filename: src/app/components/feature/bookings/BookingCard.tsx
 * Purpose: Display booking information in detail card format with HubDetailCard
 * Created: 2025-11-02
 * Updated: 2025-12-06 - Added BookingDetailModal for viewing all 19 fields
 * Updated: 2026-02-05 - Added scheduling status, Messages button, SchedulingModal (5-stage workflow)
 * Specification: Expanded detail card layout with HubDetailCard component
 * Design: Uses HubDetailCard component for consistent visual layout across all hubs
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Booking, BookingStatus, SchedulingStatus } from '@/types';
import Button from '@/app/components/ui/actions/Button';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import BookingDetailModal from './BookingDetailModal';
import SchedulingModal from './SchedulingModal';
import getProfileImageUrl from '@/lib/utils/image';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

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
  const router = useRouter();
  const { profile } = useUserProfile();

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);

  // Scheduling status helpers
  const schedulingStatus = booking.scheduling_status || 'scheduled'; // Default for existing bookings
  const isProposer = booking.proposed_by === profile?.id;
  const needsScheduling = schedulingStatus === 'unscheduled';
  const hasPendingProposal = schedulingStatus === 'proposed';
  const isScheduled = schedulingStatus === 'scheduled';

  // Format date/time - handle null session_start_time for unscheduled bookings
  const hasSessionTime = !!booking.session_start_time;
  const sessionDate = hasSessionTime ? new Date(booking.session_start_time!) : null;
  const formattedTime = sessionDate
    ? sessionDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not scheduled';

  // Format date helper
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get scheduling status display
  const getSchedulingStatusDisplay = (): { label: string; variant: 'warning' | 'info' | 'success' } => {
    switch (schedulingStatus) {
      case 'unscheduled':
        return { label: 'Needs Scheduling', variant: 'warning' };
      case 'proposed':
        return { label: isProposer ? 'Awaiting Confirmation' : 'Time Proposed', variant: 'info' };
      case 'scheduled':
      default:
        return { label: 'Scheduled', variant: 'success' };
    }
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

  // Build combined status label (booking status + scheduling status for pending)
  const getStatusLabel = (): string => {
    if (booking.status === 'Pending') {
      const schedStatus = getSchedulingStatusDisplay();
      return `${booking.status} - ${schedStatus.label}`;
    }
    return booking.status;
  };

  // Determine who the "other party" is based on view mode
  const otherParty = viewMode === 'client' ? booking.tutor : booking.client;

  // Use other party's name for avatar (consistent with marketplace)
  const avatarUrl = getProfileImageUrl({
    id: otherParty?.id || booking.id,
    avatar_url: otherParty?.avatar_url,
    full_name: otherParty?.full_name || booking.service_name,
  }, false);
  const fallbackChar = otherParty?.full_name?.substring(0, 2).toUpperCase() || booking.service_name?.substring(0, 2).toUpperCase() || '?';

  // Build description with tutor/client info
  const rolePrefix = viewMode === 'client' ? 'Tutor' : 'Client';
  const description = otherParty ? `${rolePrefix}: ${otherParty.full_name}` : undefined;

  // Get agent name if available
  const agentName = booking.agent?.full_name || 'No Agent';

  // Build details grid - 3x3 grid matching design
  const details = [
    // Row 1: Date, Time, Duration
    {
      label: 'Date',
      value: sessionDate
        ? sessionDate.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        : 'Not scheduled'
    },
    { label: 'Time', value: formattedTime },
    { label: 'Duration', value: `${booking.session_duration} mins` },
    // Row 2: Amount, Payment, Schedule Status
    { label: 'Amount', value: booking.amount ? `£${booking.amount.toFixed(2)}` : 'Free' },
    { label: 'Payment', value: booking.payment_status },
    { label: 'Schedule', value: getSchedulingStatusDisplay().label },
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
            fontSize: '0.875rem',
            color: '#6b7280',
            cursor: 'default',
            userSelect: 'text'
          }}
        >
          {formatIdForDisplay(booking.id)}
        </span>
      )
    },
  ];

  // Handle messages navigation
  const handleMessages = () => {
    // Navigate to messages with booking context
    const otherPartyId = viewMode === 'client' ? booking.tutor_id : booking.client_id;
    router.push(`/messages?user=${otherPartyId}&booking=${booking.id}`);
  };

  // Determine if Join WiseSpace button should be enabled
  const canJoinWiseSpace = booking.status === 'Confirmed' && isOnline && isScheduled;

  // Build actions
  const actions = (
    <>
      {/* Messages Button - Always visible for communication */}
      <Button
        onClick={handleMessages}
        variant="secondary"
        size="sm"
      >
        Messages
      </Button>

      {/* Schedule Session - Show if unscheduled */}
      {needsScheduling && (
        <Button
          onClick={() => setIsSchedulingModalOpen(true)}
          variant="primary"
          size="sm"
        >
          Schedule Session
        </Button>
      )}

      {/* Review Proposal - Show if other party proposed */}
      {hasPendingProposal && !isProposer && (
        <Button
          onClick={() => setIsSchedulingModalOpen(true)}
          variant="primary"
          size="sm"
        >
          Review & {booking.amount ? `Pay £${booking.amount.toFixed(2)}` : 'Confirm'}
        </Button>
      )}

      {/* Waiting message - Show if user proposed */}
      {hasPendingProposal && isProposer && (
        <Button
          onClick={() => setIsSchedulingModalOpen(true)}
          variant="secondary"
          size="sm"
        >
          View Proposal
        </Button>
      )}

      {/* Join WiseSpace: Show only if Confirmed and scheduled */}
      {canJoinWiseSpace && (
        <Link
          href={`/wisespace/${booking.id}`}
          target="_blank"
        >
          <Button
            variant="primary"
            size="sm"
          >
            Join WiseSpace
          </Button>
        </Link>
      )}

      {/* View Details button - opens modal with all fields */}
      <Button
        onClick={() => setIsDetailModalOpen(true)}
        variant="secondary"
        size="sm"
      >
        View Details
      </Button>

      {/* Reschedule button - only if confirmed and handler provided */}
      {booking.status === 'Confirmed' && onReschedule && (
        <Button
          onClick={() => setIsSchedulingModalOpen(true)}
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
    <>
      <HubDetailCard
        image={{
          src: avatarUrl,
          alt: otherParty?.full_name || 'User',
          fallbackChar: fallbackChar,
        }}
        title={booking.service_name}
        status={{
          label: getStatusLabel(),
          variant: getStatusVariant(booking.status),
        }}
        description={description}
        details={details}
        actions={actions}
        imageHref={otherParty?.id ? `/public-profile/${otherParty.id}` : undefined}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        booking={booking}
        viewMode={viewMode}
      />

      {/* Scheduling Modal */}
      <SchedulingModal
        isOpen={isSchedulingModalOpen}
        onClose={() => setIsSchedulingModalOpen(false)}
        booking={booking}
      />
    </>
  );
}
