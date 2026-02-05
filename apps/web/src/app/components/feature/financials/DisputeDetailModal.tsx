/**
 * Filename: DisputeDetailModal.tsx
 * Purpose: Modal for displaying complete dispute/transaction details
 * Created: 2025-12-06
 * Specification: Uses HubDetailModal to show all disputed transaction information
 */

'use client';

import React from 'react';
import { Transaction } from '@/types';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';

interface DisputeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: Transaction;
}

export default function DisputeDetailModal({
  isOpen,
  onClose,
  dispute,
}: DisputeDetailModalProps) {
  // Format date helper (en-GB standard)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Format time helper (24-hour format)
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Format datetime helper
  const formatDateTime = (dateString: string) => {
    return `${formatDate(dateString)} at ${formatTime(dateString)}`;
  };

  // Format short date
  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'won') return 'Resolved - Won';
    if (statusLower === 'lost') return 'Resolved - Lost';
    if (statusLower === 'under_review') return 'Under Review';
    if (statusLower === 'action_required' || statusLower === 'needs_response') return 'Action Required';
    return status;
  };

  // Calculate days until due
  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue((dispute as any).response_due);

  // Build subtitle
  const subtitle = (dispute as any).reason || dispute.description || 'Disputed Transaction';

  // Build sections with comprehensive dispute fields
  const sections: DetailSection[] = [
    {
      title: 'Dispute Information',
      fields: [
        { label: 'Disputed Amount', value: `£${Math.abs(dispute.amount).toFixed(2)}` },
        { label: 'Reason', value: (dispute as any).reason || 'Unknown' },
        { label: 'Status', value: getStatusDisplay(dispute.status || 'Unknown') },
        { label: 'Dispute Type', value: (dispute as any).dispute_type || dispute.type || 'Unknown' },
        { label: 'Description', value: dispute.description || 'N/A' },
      ],
    },
    {
      title: 'Timeline',
      fields: [
        { label: 'Dispute Raised', value: formatDateTime(dispute.created_at) },
        { label: 'Response Due', value: (dispute as any).response_due
          ? `${formatShortDate((dispute as any).response_due)}${daysUntilDue !== null ? (daysUntilDue > 0 ? ` (${daysUntilDue} days left)` : ' (Overdue)') : ''}`
          : 'N/A' },
        { label: 'Evidence Due', value: (dispute as any).evidence_due ? formatShortDate((dispute as any).evidence_due) : 'N/A' },
        ...((dispute as any).resolved_at ? [{ label: 'Resolved At', value: formatDateTime((dispute as any).resolved_at) }] : []),
      ],
    },
    {
      title: 'Evidence Status',
      fields: [
        { label: 'Evidence Submitted', value: (dispute as any).evidence_submitted ? 'Yes' : 'No' },
        ...((dispute as any).evidence_submitted_at ? [{ label: 'Submitted At', value: formatDateTime((dispute as any).evidence_submitted_at) }] : []),
        ...((dispute as any).evidence_details ? [{ label: 'Evidence Notes', value: (dispute as any).evidence_details }] : []),
      ],
    },
    {
      title: 'Payment Details',
      fields: [
        { label: 'Stripe Dispute ID', value: (dispute as any).stripe_dispute_id || 'N/A' },
        { label: 'Stripe Checkout ID', value: dispute.stripe_checkout_id || 'N/A' },
        { label: 'Stripe Payout ID', value: dispute.stripe_payout_id || 'N/A' },
      ],
    },
  ];

  // Add outcome section if resolved
  if ((dispute as any).outcome && (dispute as any).outcome !== 'pending') {
    sections.push({
      title: 'Outcome',
      fields: [
        { label: 'Result', value: (dispute as any).outcome === 'won' ? 'Won - Funds Returned' : 'Lost - Funds Deducted' },
        ...((dispute as any).outcome_reason ? [{ label: 'Reason', value: (dispute as any).outcome_reason }] : []),
      ],
    });
  }

  // Add related booking if exists
  if (dispute.booking_id || dispute.booking) {
    sections.push({
      title: 'Related Booking',
      fields: [
        { label: 'Booking ID', value: dispute.booking_id || 'N/A' },
        { label: 'Service Name', value: dispute.booking?.service_name || 'N/A' },
        { label: 'Session Date', value: dispute.booking?.session_start_time ? formatDate(dispute.booking.session_start_time) : 'N/A' },
      ],
    });
  }

  // Add system information
  sections.push({
    title: 'System Information',
    fields: [
      { label: 'Transaction ID', value: dispute.id },
      { label: 'Profile ID', value: dispute.profile_id || 'N/A' },
    ],
  });

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispute Details"
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
