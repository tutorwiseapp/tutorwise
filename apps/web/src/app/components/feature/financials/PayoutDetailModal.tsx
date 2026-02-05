/**
 * Filename: PayoutDetailModal.tsx
 * Purpose: Modal for displaying complete payout/transaction details
 * Created: 2025-12-06
 * Specification: Uses HubDetailModal to show all payout transaction information
 */

'use client';

import React from 'react';
import { Transaction } from '@/types';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';

interface PayoutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payout: Transaction;
}

export default function PayoutDetailModal({
  isOpen,
  onClose,
  payout,
}: PayoutDetailModalProps) {
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

  // Get status display
  const getStatusDisplay = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'paid' || statusLower === 'completed') return 'Completed';
    if (statusLower === 'pending') return 'Pending';
    if (statusLower === 'in_transit') return 'In Transit';
    if (statusLower === 'failed') return 'Failed';
    return status;
  };

  // Build subtitle
  const subtitle = payout.description || 'Payout Transaction';

  // Build sections with all transaction fields
  const sections: DetailSection[] = [
    {
      title: 'Payout Information',
      fields: [
        { label: 'Amount', value: `£${Math.abs(payout.amount).toFixed(2)}` },
        { label: 'Type', value: payout.type || 'Withdrawal' },
        { label: 'Status', value: getStatusDisplay(payout.status || 'Unknown') },
        { label: 'Description', value: payout.description || 'N/A' },
        { label: 'Currency', value: (payout as any).currency || 'GBP' },
      ],
    },
    {
      title: 'Bank Account',
      fields: [
        { label: 'Payment Method', value: 'Bank Transfer' },
        { label: 'Bank Name', value: (payout as any).bank_name || 'N/A' },
        { label: 'Account', value: (payout as any).bank_account ? `****${String((payout as any).bank_account).slice(-4)}` : 'N/A' },
        { label: 'Account Holder', value: (payout as any).account_holder_name || 'N/A' },
      ],
    },
    {
      title: 'Timeline',
      fields: [
        { label: 'Created At', value: formatDateTime(payout.created_at) },
        { label: 'Initiated At', value: (payout as any).initiated_at ? formatDateTime((payout as any).initiated_at) : 'N/A' },
        { label: 'Arrival Date', value: (payout as any).arrival_date ? formatDate((payout as any).arrival_date) : (payout.available_at ? formatDate(payout.available_at) : 'N/A') },
        ...((payout as any).completed_at ? [{ label: 'Completed At', value: formatDateTime((payout as any).completed_at) }] : []),
        ...((payout as any).failed_at ? [{ label: 'Failed At', value: formatDateTime((payout as any).failed_at) }] : []),
      ],
    },
    {
      title: 'Payment Details',
      fields: [
        { label: 'Stripe Payout ID', value: payout.stripe_payout_id || 'N/A' },
        { label: 'Stripe Checkout ID', value: payout.stripe_checkout_id || 'N/A' },
      ],
    },
  ];

  // Add failure details if failed
  if (payout.status?.toLowerCase() === 'failed') {
    sections.push({
      title: 'Failure Details',
      fields: [
        { label: 'Failure Code', value: (payout as any).failure_code || 'Unknown' },
        { label: 'Failure Message', value: (payout as any).failure_message || 'No details available' },
      ],
    });
  }

  // Add related booking if exists
  if (payout.booking_id || payout.booking) {
    sections.push({
      title: 'Related Booking',
      fields: [
        { label: 'Booking ID', value: payout.booking_id || 'N/A' },
        { label: 'Service Name', value: payout.booking?.service_name || 'N/A' },
        { label: 'Session Date', value: payout.booking?.session_start_time ? formatDate(payout.booking.session_start_time) : 'N/A' },
        { label: 'Client', value: payout.booking?.client?.full_name || 'N/A' },
        { label: 'Tutor', value: payout.booking?.tutor?.full_name || 'N/A' },
      ],
    });
  }

  // Add system information
  sections.push({
    title: 'System Information',
    fields: [
      { label: 'Transaction ID', value: payout.id },
      { label: 'Profile ID', value: payout.profile_id || 'Platform Fee' },
    ],
  });

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="Payout Details"
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
