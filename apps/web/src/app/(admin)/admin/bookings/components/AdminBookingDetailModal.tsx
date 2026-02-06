/**
 * Filename: AdminBookingDetailModal.tsx
 * Purpose: Admin-specific booking detail modal with full information and admin actions
 * Created: 2025-12-25
 * Updated: 2025-12-26 - Added Contact Client/Tutor, Change Status, and full API implementations
 * Pattern: Uses HubDetailModal with admin-specific sections and actions
 *
 * Features:
 * - Complete booking information (all 19+ fields)
 * - Admin-specific actions (Approve, Cancel, Refund, Contact, Change Status)
 * - Payment details and status
 * - Participant information (client, tutor, agent)
 * - Booking metadata (type, source, referrer)
 *
 * Usage:
 * <AdminBookingDetailModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   booking={booking}
 *   onBookingUpdated={refreshBookingsList}
 * />
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Booking } from '@/types';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';
import { createClient } from '@/utils/supabase/client';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import styles from './AdminBookingDetailModal.module.css';

interface AdminBookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onBookingUpdated?: () => void; // Callback to refresh booking list after update
}

export default function AdminBookingDetailModal({
  isOpen,
  onClose,
  booking,
  onBookingUpdated,
}: AdminBookingDetailModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isProcessing, setIsProcessing] = useState(false);
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
        { label: 'Session Date', value: booking.session_start_time ? formatDate(booking.session_start_time) : 'Not scheduled' },
        { label: 'Session Time', value: booking.session_start_time ? formatTime(booking.session_start_time) : 'Not scheduled' },
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
          label: 'Delivery Mode',
          value: booking.delivery_mode === 'online' ? 'Online'
            : booking.delivery_mode === 'in_person' ? 'In Person'
            : booking.delivery_mode === 'hybrid' ? 'Hybrid'
            : booking.delivery_mode || 'N/A'
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
      title: 'Scheduling Details',
      fields: [
        {
          label: 'Scheduling Status',
          value: booking.scheduling_status === 'unscheduled' ? 'Needs Scheduling'
            : booking.scheduling_status === 'proposed' ? 'Time Proposed'
            : booking.scheduling_status === 'scheduled' ? 'Scheduled'
            : booking.scheduling_status || 'Scheduled'
        },
        { label: 'Proposed By', value: booking.proposed_by || 'N/A' },
        { label: 'Proposed At', value: booking.proposed_at ? formatDateTime(booking.proposed_at) : 'N/A' },
        { label: 'Confirmed By', value: booking.schedule_confirmed_by || 'N/A' },
        { label: 'Confirmed At', value: booking.schedule_confirmed_at ? formatDateTime(booking.schedule_confirmed_at) : 'N/A' },
        { label: 'Reschedule Count', value: booking.reschedule_count?.toString() || '0' },
        { label: 'Slot Reserved Until', value: booking.slot_reserved_until ? formatDateTime(booking.slot_reserved_until) : 'N/A' },
        { label: 'Reminder Sent At', value: booking.reminder_sent_at ? formatDateTime(booking.reminder_sent_at) : 'Not sent' },
      ],
    },
    {
      title: 'Status & Timeline',
      fields: [
        { label: 'Booking Status', value: booking.status },
        { label: 'Payment Status', value: booking.payment_status },
        { label: 'Created At', value: formatDateTime(booking.created_at) },
        { label: 'Last Updated', value: booking.updated_at ? formatDateTime(booking.updated_at) : 'N/A' },
      ],
    },
  ];

  // Helper to update booking status via API (sends email notifications)
  const updateBookingStatus = async (newStatus: string, reason?: string) => {
    const response = await fetch(`/api/bookings/${booking.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, reason }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update status');
    }

    return response.json();
  };

  // Admin action handlers
  const handleApprove = async () => {
    if (isProcessing) return;

    if (!confirm(`Are you sure you want to approve/confirm this booking?\n\nService: ${booking.service_name}\nClient: ${booking.client?.full_name}\nTutor: ${booking.tutor?.full_name}\n\nConfirmation emails will be sent to all parties.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await updateBookingStatus('Confirmed');
      const emailsSent = result.emailsSent;

      let message = 'Booking approved successfully!';
      if (emailsSent) {
        const sent = [
          emailsSent.client && 'client',
          emailsSent.tutor && 'tutor',
          emailsSent.agent && 'agent',
        ].filter(Boolean);
        if (sent.length > 0) {
          message += `\n\nConfirmation emails sent to: ${sent.join(', ')}`;
        }
      }

      alert(message);
      onBookingUpdated?.();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to approve booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (isProcessing) return;

    const reason = prompt(
      `Are you sure you want to cancel this booking?\n\nService: ${booking.service_name}\nClient: ${booking.client?.full_name}\n\nCancellation emails will be sent to all parties.\n\nPlease provide a reason (optional):`
    );

    // prompt returns null if cancelled, empty string if OK with no input
    if (reason === null) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await updateBookingStatus('Cancelled', reason || undefined);
      const emailsSent = result.emailsSent;

      let message = 'Booking cancelled successfully!';
      if (emailsSent) {
        const sent = [
          emailsSent.client && 'client',
          emailsSent.tutor && 'tutor',
          emailsSent.agent && 'agent',
        ].filter(Boolean);
        if (sent.length > 0) {
          message += `\n\nCancellation emails sent to: ${sent.join(', ')}`;
        }
      }

      alert(message);
      onBookingUpdated?.();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to cancel booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (isProcessing) return;

    if (!confirm(`Are you sure you want to issue a refund?\n\nAmount: £${booking.amount.toFixed(2)}\nClient: ${booking.client?.full_name}\n\nNote: This will update the payment status. Actual refund processing via Stripe should be done separately.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      // Update payment status to Refunded
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'Refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      alert('Payment status updated to Refunded.\n\nNote: Please process the actual refund via Stripe dashboard.');
      onBookingUpdated?.();
      onClose();
    } catch (error) {
      alert('Failed to update refund status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (isProcessing) return;

    let reason: string | undefined;

    // For cancellation, prompt for reason
    if (newStatus === 'Cancelled') {
      const input = prompt(
        `Change booking status to "${newStatus}"?\n\nEmails will be sent to all parties.\n\nPlease provide a reason (optional):`
      );
      if (input === null) return;
      reason = input || undefined;
    } else {
      const emailNote = newStatus === 'Confirmed'
        ? '\n\nConfirmation emails will be sent to all parties.'
        : '';
      if (!confirm(`Change booking status to "${newStatus}"?${emailNote}`)) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      const result = await updateBookingStatus(newStatus, reason);
      const emailsSent = result.emailsSent;

      let message = `Booking status changed to ${newStatus} successfully!`;
      if (emailsSent && (newStatus === 'Confirmed' || newStatus === 'Cancelled')) {
        const sent = [
          emailsSent.client && 'client',
          emailsSent.tutor && 'tutor',
          emailsSent.agent && 'agent',
        ].filter(Boolean);
        if (sent.length > 0) {
          message += `\n\nEmails sent to: ${sent.join(', ')}`;
        }
      }

      alert(message);
      onBookingUpdated?.();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to change booking status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContactClient = () => {
    if (booking.client_id) {
      // Open messages with client
      router.push(`/messages?userId=${booking.client_id}`);
    } else {
      alert('Client information not available');
    }
  };

  const handleContactTutor = () => {
    if (booking.tutor_id) {
      // Open messages with tutor
      router.push(`/messages?userId=${booking.tutor_id}`);
    } else {
      alert('Tutor information not available');
    }
  };

  const handleContactAgent = () => {
    if (booking.agent_id) {
      // Open messages with agent
      router.push(`/messages?userId=${booking.agent_id}`);
    } else {
      alert('Agent information not available');
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
        <div className={styles.actionsWrapper}>
          {/* Primary Actions */}
          {booking.status === 'Pending' && (
            <Button onClick={handleApprove} variant="primary" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Approve Booking'}
            </Button>
          )}
          {booking.payment_status === 'Paid' && booking.status !== 'Cancelled' && (
            <Button onClick={handleRefund} variant="secondary" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Issue Refund'}
            </Button>
          )}
          {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
            <Button onClick={handleCancel} variant="danger" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Cancel Booking'}
            </Button>
          )}

          {/* Contact Actions */}
          {booking.client_id && (
            <Button
              onClick={handleContactClient}
              variant="secondary"
              disabled={isProcessing}
            >
              Contact Client
            </Button>
          )}
          {booking.tutor_id && (
            <Button
              onClick={handleContactTutor}
              variant="secondary"
              disabled={isProcessing}
            >
              Contact Tutor
            </Button>
          )}
          {booking.agent_id && (
            <Button
              onClick={handleContactAgent}
              variant="secondary"
              disabled={isProcessing}
            >
              Contact Agent
            </Button>
          )}

          {/* Change Status Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="secondary"
                disabled={isProcessing}
              >
                Change Status
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={styles.statusDropdownContent}
                sideOffset={5}
                align="start"
              >
                {['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Declined'].map((status) => (
                  <DropdownMenu.Item
                    key={status}
                    className={styles.statusDropdownItem}
                    disabled={booking.status === status || isProcessing}
                    onSelect={() => handleChangeStatus(status)}
                  >
                    {status}
                    {booking.status === status && (
                      <span className={styles.currentStatusBadge}>(Current)</span>
                    )}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      }
    />
  );
}
