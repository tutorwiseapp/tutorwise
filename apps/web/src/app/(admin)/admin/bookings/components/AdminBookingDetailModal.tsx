/**
 * Filename: AdminBookingDetailModal.tsx
 * Purpose: Admin-specific booking detail modal with full information and admin actions
 * Created: 2025-12-25
 * Pattern: Uses HubDetailModal with admin-specific sections and actions
 *
 * Features:
 * - Complete booking information (all 19+ fields)
 * - Admin-specific actions (Approve, Cancel, Refund)
 * - Payment details and status
 * - Participant information (client, tutor, agent)
 * - Booking metadata (type, source, referrer)
 *
 * Usage:
 * <AdminBookingDetailModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   booking={booking}
 * />
 */

'use client';

import React from 'react';
import { Booking } from '@/types';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';

interface AdminBookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

export default function AdminBookingDetailModal({
  isOpen,
  onClose,
  booking,
}: AdminBookingDetailModalProps) {
  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Format time helper
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Format datetime helper
  const formatDateTime = (dateString: string) => {
    return `${formatDate(dateString)} at ${formatTime(dateString)}`;
  };

  // Build subtitle
  const subtitle = `Booking ID: ${booking.id}`;

  // Build sections with all booking fields
  const sections: DetailSection[] = [
    {
      title: 'Session Information',
      fields: [
        { label: 'Service Name', value: booking.service_name },
        { label: 'Session Date', value: formatDate(booking.session_start_time) },
        { label: 'Session Time', value: formatTime(booking.session_start_time) },
        { label: 'Duration', value: `${booking.session_duration} minutes` },
        { label: 'Subjects', value: booking.subjects?.join(', ') || 'N/A' },
        { label: 'Levels', value: booking.levels?.join(', ') || 'N/A' },
      ],
    },
    {
      title: 'Participants',
      fields: [
        { label: 'Client Name', value: booking.client?.full_name || 'N/A' },
        { label: 'Client ID', value: booking.client_id },
        { label: 'Tutor Name', value: booking.tutor?.full_name || 'N/A' },
        { label: 'Tutor ID', value: booking.tutor_id },
        { label: 'Agent Name', value: booking.agent?.full_name || 'N/A' },
        { label: 'Agent ID', value: booking.agent_id || 'N/A' },
      ],
    },
    {
      title: 'Payment & Pricing',
      fields: [
        { label: 'Total Amount', value: `£${booking.amount.toFixed(2)}` },
        { label: 'Hourly Rate', value: booking.hourly_rate ? `£${booking.hourly_rate.toFixed(2)}/hr` : 'N/A' },
        { label: 'Payment Status', value: booking.payment_status },
        { label: 'Free Trial', value: booking.free_trial ? 'Yes' : 'No' },
        { label: 'Free Help Available', value: booking.available_free_help ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Location & Details',
      fields: [
        {
          label: 'Location Type',
          value: booking.location_type === 'online' ? 'Online'
            : booking.location_type === 'in_person' ? 'In Person'
            : booking.location_type === 'hybrid' ? 'Hybrid'
            : booking.location_type || 'N/A'
        },
        { label: 'City', value: booking.location_city || 'N/A' },
        { label: 'Listing Slug', value: booking.listing_slug || 'N/A' },
      ],
    },
    {
      title: 'Booking Metadata',
      fields: [
        {
          label: 'Booking Type',
          value: booking.booking_type === 'direct' ? 'Direct'
            : booking.booking_type === 'referred' ? 'Referred'
            : booking.booking_type === 'agent_job' ? 'Agent Job'
            : booking.booking_type || 'N/A'
        },
        {
          label: 'Booking Source',
          value: booking.booking_source === 'listing' ? 'Listing'
            : booking.booking_source === 'profile' ? 'Profile'
            : booking.booking_source || 'N/A'
        },
        {
          label: 'Referrer Role',
          value: booking.referrer_role === 'agent' ? 'Agent'
            : booking.referrer_role === 'tutor' ? 'Tutor'
            : booking.referrer_role === 'client' ? 'Client'
            : booking.referrer_role || 'N/A'
        },
      ],
    },
    {
      title: 'Status & Timeline',
      fields: [
        { label: 'Booking Status', value: booking.status },
        { label: 'Created At', value: formatDateTime(booking.created_at) },
        { label: 'Last Updated', value: booking.updated_at ? formatDateTime(booking.updated_at) : 'N/A' },
      ],
    },
  ];

  // Admin action handlers
  const handleApprove = () => {
    // TODO: Implement approve booking
    console.log('Approve booking:', booking.id);
    alert('Approve booking functionality coming soon');
  };

  const handleCancel = () => {
    // TODO: Implement cancel booking
    if (confirm(`Are you sure you want to cancel this booking?\n\nService: ${booking.service_name}\nClient: ${booking.client?.full_name}`)) {
      console.log('Cancel booking:', booking.id);
      alert('Cancel booking functionality coming soon');
    }
  };

  const handleRefund = () => {
    // TODO: Implement refund booking
    if (confirm(`Are you sure you want to issue a refund?\n\nAmount: £${booking.amount.toFixed(2)}\nClient: ${booking.client?.full_name}`)) {
      console.log('Refund booking:', booking.id);
      alert('Refund functionality coming soon');
    }
  };

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={booking.service_name}
      subtitle={subtitle}
      size="xl"
      sections={sections}
      actions={
        <>
          {booking.status === 'Pending' && (
            <Button onClick={handleApprove} variant="primary">
              Approve Booking
            </Button>
          )}
          {booking.payment_status === 'Paid' && booking.status !== 'Cancelled' && (
            <Button onClick={handleRefund} variant="secondary">
              Issue Refund
            </Button>
          )}
          {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
            <Button onClick={handleCancel} variant="danger">
              Cancel Booking
            </Button>
          )}
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </>
      }
    />
  );
}
