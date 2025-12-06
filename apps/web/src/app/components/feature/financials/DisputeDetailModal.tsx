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

  // Build subtitle
  const subtitle = dispute.description || 'Disputed Transaction';

  // Build sections with all transaction fields
  const sections: DetailSection[] = [
    {
      title: 'Dispute Information',
      fields: [
        { label: 'Amount', value: `£${Math.abs(dispute.amount).toFixed(2)}` },
        { label: 'Type', value: dispute.type || 'Unknown' },
        { label: 'Status', value: dispute.status || 'Unknown' },
        { label: 'Description', value: dispute.description || 'N/A' },
        { label: 'Dispute Raised', value: formatDateTime(dispute.created_at) },
        { label: 'Available At', value: dispute.available_at ? formatDateTime(dispute.available_at) : 'N/A' },
      ],
    },
    {
      title: 'Payment Details',
      fields: [
        { label: 'Payment Method', value: 'Bank Transfer' },
        { label: 'Stripe Payout ID', value: dispute.stripe_payout_id || 'N/A' },
        { label: 'Stripe Checkout ID', value: dispute.stripe_checkout_id || 'N/A' },
      ],
    },
    {
      title: 'Related Booking',
      fields: [
        { label: 'Booking ID', value: dispute.booking_id || 'N/A' },
      ],
    },
    {
      title: 'System Information',
      fields: [
        { label: 'Transaction ID', value: dispute.id },
        { label: 'Profile ID', value: dispute.profile_id || 'N/A' },
        { label: 'Created At', value: formatDateTime(dispute.created_at) },
        { label: 'Available At', value: dispute.available_at ? formatDateTime(dispute.available_at) : 'N/A' },
      ],
    },
  ];

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
