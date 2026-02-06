/**
 * Filename: TransactionDetailModal.tsx
 * Purpose: Modal for displaying complete transaction details
 * Created: 2025-12-06
 * Specification: Uses HubDetailModal to show all transaction information
 */

'use client';

import React from 'react';
import { Transaction } from '@/types';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  currentUserId: string;
}

export default function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
  currentUserId,
}: TransactionDetailModalProps) {
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

  // Determine counterparty
  const determineCounterparty = () => {
    if (transaction.type === 'Withdrawal') {
      return 'Withdrawal to Bank Account';
    }
    if (transaction.type === 'Platform Fee') {
      return 'Tutorwise Platform';
    }

    if (transaction.booking) {
      const booking = transaction.booking;
      if (booking.tutor_id === currentUserId) {
        return booking.client?.full_name || 'Client';
      }
      if (booking.client_id === currentUserId) {
        return booking.tutor?.full_name || 'Tutor';
      }
      const agent = booking.tutor || booking.client;
      return agent?.full_name || 'Unknown';
    }

    return 'Unknown';
  };

  // Determine credit/debit
  const isCredit =
    (transaction.type === 'Booking Payment' && transaction.booking?.tutor_id === currentUserId) ||
    transaction.type === 'Referral Commission' ||
    transaction.type === 'Agent Commission';

  const isDebit =
    (transaction.type === 'Booking Payment' && transaction.booking?.client_id === currentUserId) ||
    transaction.type === 'Platform Fee' ||
    transaction.type === 'Withdrawal';

  const amountPrefix = isCredit ? '+' : (isDebit && transaction.type !== 'Withdrawal' ? '-' : '');
  const amountDisplay = `${amountPrefix}£${transaction.amount.toFixed(2)}`;
  const amountType = isCredit ? 'Credit' : (isDebit ? 'Debit' : 'Transfer');

  // Build subtitle
  const subtitle = transaction.type;

  // Build sections
  const sections: DetailSection[] = [
    {
      title: 'Transaction Information',
      fields: [
        { label: 'Amount', value: amountDisplay },
        { label: 'Type', value: transaction.type },
        { label: 'Amount Type', value: amountType },
        { label: 'Status', value: transaction.status },
        { label: 'Description', value: transaction.description || 'N/A' },
        { label: 'Counterparty', value: determineCounterparty() },
        { label: 'Created At', value: formatDateTime(transaction.created_at) },
        { label: 'Available At', value: transaction.available_at ? formatDateTime(transaction.available_at) : 'N/A' },
      ],
    },
    {
      title: 'Payment Details',
      fields: [
        { label: 'Stripe Payout ID', value: transaction.stripe_payout_id || 'N/A' },
        { label: 'Stripe Checkout ID', value: transaction.stripe_checkout_id || 'N/A' },
      ],
    },
  ];

  // Add Service Context section (Migrations 107, 110: Shows snapshot fields even if booking deleted)
  if (transaction.service_name || transaction.booking) {
    sections.push({
      title: 'Service Context (Migrations 107, 110)',
      fields: [
        { label: 'Service Name', value: transaction.service_name || transaction.booking?.service_name || 'N/A' },
        { label: 'Subjects', value: transaction.subjects?.join(', ') || 'N/A' },
        { label: 'Session Date', value: transaction.session_date ? formatDate(transaction.session_date) : (transaction.booking?.session_start_time ? formatDate(transaction.booking.session_start_time) : 'N/A') },
        { label: 'Location Type', value: transaction.delivery_mode || 'N/A' },
        { label: 'Tutor', value: transaction.tutor_name || transaction.booking?.tutor?.full_name || 'N/A' },
        { label: 'Client', value: transaction.client_name || transaction.booking?.client?.full_name || 'N/A' },
        { label: 'Agent', value: transaction.agent_name || 'N/A' },
      ],
    });
  }

  // Add Related Booking section if booking exists
  if (transaction.booking) {
    sections.push({
      title: 'Related Booking',
      fields: [
        { label: 'Booking ID', value: transaction.booking_id || 'N/A' },
        { label: 'Service Name', value: transaction.booking.service_name },
        { label: 'Session Date', value: formatDate(transaction.booking.session_start_time) },
        { label: 'Client', value: transaction.booking.client?.full_name || 'N/A' },
        { label: 'Tutor', value: transaction.booking.tutor?.full_name || 'N/A' },
      ],
    });
  }

  // Add System Information section
  sections.push({
    title: 'System Information',
    fields: [
      { label: 'Transaction ID', value: transaction.id },
      { label: 'Profile ID', value: transaction.profile_id || 'Platform Transaction' },
    ],
  });

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Details"
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
