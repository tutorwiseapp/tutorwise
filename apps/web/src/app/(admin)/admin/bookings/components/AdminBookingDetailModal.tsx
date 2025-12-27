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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
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
  const handleApprove = async () => {
    if (isProcessing) return;

    if (!confirm(`Are you sure you want to approve/confirm this booking?\n\nService: ${booking.service_name}\nClient: ${booking.client?.full_name}\nTutor: ${booking.tutor?.full_name}`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'Confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      alert('Booking approved successfully!');
      onBookingUpdated?.();
      onClose();
    } catch (error) {
      console.error('Failed to approve booking:', error);
      alert('Failed to approve booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (isProcessing) return;

    if (!confirm(`Are you sure you want to cancel this booking?\n\nService: ${booking.service_name}\nClient: ${booking.client?.full_name}\n\nThis action will update the booking status to Cancelled.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'Cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      alert('Booking cancelled successfully!');
      onBookingUpdated?.();
      onClose();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      alert('Failed to cancel booking. Please try again.');
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
      console.error('Failed to update refund status:', error);
      alert('Failed to update refund status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (isProcessing) return;

    if (!confirm(`Change booking status to "${newStatus}"?`)) {
      setShowStatusDropdown(false);
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      alert(`Booking status changed to ${newStatus} successfully!`);
      setShowStatusDropdown(false);
      onBookingUpdated?.();
      onClose();
    } catch (error) {
      console.error('Failed to change booking status:', error);
      alert('Failed to change booking status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContactClient = () => {
    if (booking.client_id) {
      // Open network/messages with client
      router.push(`/network/chat/${booking.client_id}`);
    } else {
      alert('Client information not available');
    }
  };

  const handleContactTutor = () => {
    if (booking.tutor_id) {
      // Open network/messages with tutor
      router.push(`/network/chat/${booking.tutor_id}`);
    } else {
      alert('Tutor information not available');
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
          <style jsx>{`
            .actionsWrapper {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 16px !important;
              width: 100% !important;
              align-items: flex-start !important;
            }
          `}</style>
          <div className="actionsWrapper">
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

            {/* Change Status Dropdown */}
            <div style={{ position: 'relative' }}>
              <Button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                variant="secondary"
                disabled={isProcessing}
              >
                Change Status
              </Button>
              {showStatusDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '0.25rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '160px',
                  padding: '0.5rem 0',
                }}>
                  {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleChangeStatus(status)}
                      disabled={booking.status === status || isProcessing}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        border: 'none',
                        background: booking.status === status ? '#f3f4f6' : 'transparent',
                        cursor: booking.status === status ? 'default' : 'pointer',
                        fontSize: '0.875rem',
                        color: booking.status === status ? '#9ca3af' : '#374151',
                      }}
                      onMouseEnter={(e) => {
                        if (booking.status !== status && !isProcessing) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (booking.status !== status) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {status} {booking.status === status && '(Current)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <Button onClick={onClose} variant="secondary" disabled={isProcessing}>
              Close
            </Button>
          </div>
        </>
      }
    />
  );
}
