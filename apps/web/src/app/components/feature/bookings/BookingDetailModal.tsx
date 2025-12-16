/**
 * Filename: BookingDetailModal.tsx
 * Purpose: Modal for displaying complete booking details (all 19 fields)
 * Created: 2025-12-06
 * Specification: Uses HubDetailModal to show all booking information
 */

'use client';

import React from 'react';
import { Booking } from '@/types';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  viewMode: 'client' | 'tutor';
}

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  viewMode,
}: BookingDetailModalProps) {
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

  // Determine the other party
  const otherParty = viewMode === 'client' ? booking.tutor : booking.client;
  const rolePrefix = viewMode === 'client' ? 'Tutor' : 'Client';

  // Build subtitle
  const subtitle = booking.service_name;

  // Build sections with all booking fields (including Migration 104 snapshot fields)
  const sections: DetailSection[] = [
    {
      title: 'Session Information',
      fields: [
        { label: 'Service Name', value: booking.service_name },
        { label: 'Session Date', value: formatDate(booking.session_start_time) },
        { label: 'Session Time', value: formatTime(booking.session_start_time) },
        { label: 'Duration', value: `${booking.session_duration} minutes` },
        { label: 'Session Start', value: formatDateTime(booking.session_start_time) },
        {
          label: 'Booking Type',
          value: booking.booking_type === 'direct' ? 'Direct'
            : booking.booking_type === 'referred' ? 'Referred'
            : booking.booking_type === 'agent_job' ? 'Agent Job'
            : booking.booking_type || 'N/A'
        },
      ],
    },
    {
      title: 'Service Details (Migrations 104, 108)',
      fields: [
        { label: 'Subjects', value: booking.subjects?.join(', ') || 'N/A' },
        { label: 'Levels', value: booking.levels?.join(', ') || 'N/A' },
        { label: 'Location Type', value: booking.location_type ?
            booking.location_type === 'online' ? 'Online' :
            booking.location_type === 'in_person' ? 'In Person' :
            booking.location_type === 'hybrid' ? 'Hybrid' : booking.location_type
          : 'N/A' },
        { label: 'Location City', value: booking.location_city || 'N/A' },
        { label: 'Free Trial', value: booking.free_trial ? 'Yes' : 'No' },
        { label: 'Hourly Rate (at booking)', value: booking.hourly_rate ? `£${booking.hourly_rate}/hr` : 'N/A' },
        { label: 'Free Help Available', value: booking.available_free_help ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Participants',
      fields: [
        { label: `${rolePrefix} Name`, value: otherParty?.full_name || 'N/A' },
        { label: `${rolePrefix} ID`, value: viewMode === 'client' ? booking.tutor_id : booking.client_id },
        { label: 'Agent Name', value: booking.agent?.full_name || 'No Agent' },
        { label: 'Agent ID', value: booking.agent_id || 'N/A' },
      ],
    },
    {
      title: 'Financial Details',
      fields: [
        { label: 'Amount', value: `£${booking.amount.toFixed(2)}` },
        { label: 'Payment Status', value: booking.payment_status },
        { label: 'Booking Status', value: booking.status },
      ],
    },
    {
      title: 'Listing & References',
      fields: [
        { label: 'Listing ID', value: booking.listing_id || 'N/A' },
        { label: 'Listing Title', value: booking.listing?.title || 'N/A' },
        { label: 'Listing Slug', value: booking.listing_slug || 'N/A' },
      ],
    },
    {
      title: 'System Information',
      fields: [
        { label: 'Booking ID', value: booking.id },
        { label: 'Created At', value: formatDateTime(booking.created_at) },
        { label: 'Updated At', value: booking.updated_at ? formatDateTime(booking.updated_at) : 'N/A' },
      ],
    },
  ];

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="Booking Details"
      subtitle={subtitle}
      sections={sections}
      actions={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    />
  );
}
