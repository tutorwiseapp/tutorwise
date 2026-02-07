/**
 * Filename: BookingDetailModal.tsx
 * Purpose: Modal for displaying complete booking details (all fields including scheduling)
 * Created: 2025-12-06
 * Updated: 2026-02-05 - Added scheduling fields (5-stage workflow)
 * Specification: Uses HubDetailModal to show all booking information
 */

'use client';

import React from 'react';
import { Booking } from '@/types';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';
import CancelBookingButton from './CancelBookingButton';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  viewMode: 'client' | 'tutor';
  onBookingUpdated?: () => void; // Callback when booking is updated (cancelled)
}

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  viewMode,
  onBookingUpdated,
}: BookingDetailModalProps) {
  // Format date helper - handles null/undefined
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Format time helper - handles null/undefined
  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Format datetime helper - handles null/undefined
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not scheduled';
    return `${formatDate(dateString)} at ${formatTime(dateString)}`;
  };

  // Get scheduling status display
  const getSchedulingStatusDisplay = () => {
    switch (booking.scheduling_status) {
      case 'unscheduled':
        return 'Needs Scheduling';
      case 'proposed':
        return 'Time Proposed';
      case 'scheduled':
        return 'Scheduled';
      default:
        return booking.scheduling_status || 'Scheduled';
    }
  };

  // Determine the other party
  const otherParty = viewMode === 'client' ? booking.tutor : booking.client;
  const rolePrefix = viewMode === 'client' ? 'Tutor' : 'Client';

  // Build subtitle
  const subtitle = booking.service_name;

  // Build sections with all booking fields (including scheduling and snapshot fields)
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
      title: 'Scheduling Details',
      fields: [
        { label: 'Scheduling Status', value: getSchedulingStatusDisplay() },
        { label: 'Proposed By', value: booking.proposed_by || 'N/A' },
        { label: 'Proposed At', value: booking.proposed_at ? formatDateTime(booking.proposed_at) : 'N/A' },
        { label: 'Confirmed By', value: booking.schedule_confirmed_by || 'N/A' },
        { label: 'Confirmed At', value: booking.schedule_confirmed_at ? formatDateTime(booking.schedule_confirmed_at) : 'N/A' },
        { label: 'Reschedule Count', value: booking.reschedule_count?.toString() || '0' },
        { label: 'Slot Reserved Until', value: booking.slot_reserved_until ? formatDateTime(booking.slot_reserved_until) : 'N/A' },
      ],
    },
    {
      title: 'Service Details',
      fields: [
        { label: 'Subjects', value: booking.subjects?.join(', ') || 'N/A' },
        { label: 'Levels', value: booking.levels?.join(', ') || 'N/A' },
        { label: 'Delivery Mode', value: booking.delivery_mode ?
            booking.delivery_mode === 'online' ? 'Online' :
            booking.delivery_mode === 'in_person' ? 'In Person' :
            booking.delivery_mode === 'hybrid' ? 'Hybrid' : booking.delivery_mode
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
    // Cancellation & Refund section (only show if cancelled)
    ...(booking.status === 'Cancelled' ? [{
      title: 'Cancellation & Refund Details',
      fields: [
        {
          label: 'Cancelled At',
          value: booking.cancelled_at ? formatDateTime(booking.cancelled_at) : 'N/A'
        },
        {
          label: 'Cancelled By',
          value: booking.cancelled_by === booking.client_id ? 'Client' :
                 booking.cancelled_by === booking.tutor_id ? 'Tutor' :
                 'Admin'
        },
        {
          label: 'Cancellation Reason',
          value: booking.cancellation_reason || 'N/A'
        },
        {
          label: 'Policy Applied',
          value: booking.cancellation_policy_applied ?
            booking.cancellation_policy_applied === 'client_24h+' ? 'Client (24h+ notice) - Full refund' :
            booking.cancellation_policy_applied === 'client_<24h' ? 'Client (<24h notice) - No refund' :
            booking.cancellation_policy_applied === 'client_no_show' ? 'Client no-show - No refund' :
            booking.cancellation_policy_applied === 'tutor_cancellation' ? 'Tutor cancellation - Full refund + CaaS penalty' :
            booking.cancellation_policy_applied === 'tutor_no_show' ? 'Tutor no-show - Full refund + Major CaaS penalty' :
            booking.cancellation_policy_applied
            : 'N/A'
        },
        {
          label: 'Refund Status',
          value: booking.payment_status === 'Refunded' ? '✅ Refunded' :
                 booking.payment_status === 'Paid' ? 'No refund issued' :
                 booking.payment_status
        },
        ...(booking.payment_status === 'Refunded' ? [{
          label: 'Estimated Net Refund',
          value: `£${(booking.amount - (booking.amount * 0.015 + 0.20)).toFixed(2)} (minus Stripe fee)`
        }] : []),
        ...(booking.caas_impact ? [{
          label: 'CaaS Impact (Tutor)',
          value: `${booking.caas_impact} points`
        }] : []),
      ].filter(Boolean),
    }] : []),
    // v7.0 Advanced Scheduling section (only show if any v7.0 features are present)
    ...((booking.recurring_series_id || booking.reminders?.length || booking.no_show_report || booking.quick_rating) ? [{
      title: 'Advanced Scheduling (v7.0)',
      fields: [
        // Recurring booking info
        ...(booking.recurring_series_id ? [
          {
            label: 'Recurring Series',
            value: `Part of recurring series (Instance #${booking.series_instance_number || 'N/A'})`
          },
          ...(booking.recurring_series ? [
            {
              label: 'Series Status',
              value: booking.recurring_series.status === 'active' ? '✅ Active' :
                     booking.recurring_series.status === 'paused' ? '⏸️ Paused' :
                     booking.recurring_series.status === 'cancelled' ? '❌ Cancelled' :
                     booking.recurring_series.status
            },
          ] : []),
        ] : []),
        // Reminder status
        ...(booking.reminders && booking.reminders.length > 0 ? [
          {
            label: 'Reminders',
            value: `${booking.reminders.filter(r => r.status === 'sent').length} of ${booking.reminders.length} sent`
          },
          {
            label: 'Reminder Details',
            value: booking.reminders.map(r =>
              `${r.reminder_type.toUpperCase()}: ${r.status === 'sent' ? '✅ Sent' : r.status === 'failed' ? '❌ Failed' : '⏳ Pending'}`
            ).join(', ')
          },
        ] : [
          { label: 'Reminders', value: 'No reminders scheduled' }
        ]),
        // Quick rating
        ...(booking.quick_rating ? [
          {
            label: 'Quick Rating',
            value: `${'⭐'.repeat(booking.quick_rating.rating)} (${booking.quick_rating.rating}/5 stars)`
          },
          {
            label: 'Rating Captured',
            value: formatDateTime(booking.quick_rating.captured_at)
          },
        ] : []),
        // No-show report
        ...(booking.no_show_report ? [
          {
            label: 'No-Show Report',
            value: `${booking.no_show_report.no_show_party === 'client' ? 'Client' : 'Tutor'} reported as no-show`
          },
          {
            label: 'Report Status',
            value: booking.no_show_report.status === 'confirmed' ? '✅ Confirmed' :
                   booking.no_show_report.status === 'disputed' ? '⚠️ Disputed' :
                   '⏳ Pending Review'
          },
          {
            label: 'Reported At',
            value: formatDateTime(booking.no_show_report.reported_at)
          },
        ] : []),
      ].filter(Boolean),
    }] : []),
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CancelBookingButton
            booking={booking}
            viewMode={viewMode}
            onCancelled={() => {
              onClose();
              if (onBookingUpdated) {
                onBookingUpdated();
              }
            }}
          />
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    />
  );
}
