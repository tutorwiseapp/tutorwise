/**
 * Filename: PayoutCard.tsx
 * Purpose: Display payout information in detail card format with HubDetailCard
 * Created: 2025-12-06
 * Updated: 2025-12-06 - Added PayoutDetailModal for viewing all transaction fields
 * Specification: Payout card following HubDetailCard pattern (consistent with TransactionCard)
 */
'use client';

import React, { useState } from 'react';
import { Transaction } from '@/types';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import PayoutDetailModal from './PayoutDetailModal';
import Button from '@/app/components/ui/actions/Button';

interface PayoutCardProps {
  payout: Transaction;
}

export default function PayoutCard({ payout }: PayoutCardProps) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Format date helper (en-GB standard)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
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

  // Map status to HubDetailCard status variant
  const getStatus = (): { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' | 'info' } => {
    const status = payout.status?.toLowerCase() || '';

    if (status === 'paid' || status === 'paid_out') {
      return { label: payout.status || 'Paid', variant: 'success' };
    }
    if (status === 'clearing' || status === 'pending' || status === 'in_transit') {
      return { label: payout.status || 'Pending', variant: 'warning' };
    }
    if (status === 'failed') {
      return { label: payout.status || 'Failed', variant: 'error' };
    }

    return { label: payout.status || 'Unknown', variant: 'neutral' };
  };

  // Get image properties (bank/payment icon)
  const image = {
    src: null,
    alt: 'Bank Account',
    fallbackChar: '💳',
  };

  // Build title (amount)
  const title = `£${Math.abs(payout.amount).toFixed(2)}`;

  // Build description
  const description = payout.description || 'Withdrawal';

  // Build details grid - 3x3 grid for balance with 160px avatar
  const details = [
    // Row 1: Amount, Type, Status
    { label: 'Amount', value: `£${Math.abs(payout.amount).toFixed(2)}` },
    { label: 'Type', value: payout.type || 'Withdrawal' },
    { label: 'Status', value: payout.status || 'Unknown' },
    // Row 2: Date, Time, Method
    { label: 'Date', value: formatDate(payout.created_at) },
    { label: 'Time', value: formatTime(payout.created_at) },
    { label: 'Method', value: 'Bank Transfer' },
    // Row 3: Reference, Description, -
    { label: 'Reference', value: payout.stripe_payout_id || 'N/A' },
    { label: 'Description', value: payout.description || 'Withdrawal' },
    { label: '', value: '' },
  ];

  return (
    <>
      <HubDetailCard
        image={image}
        title={title}
        description={description}
        status={getStatus()}
        details={details}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
            View Details
          </Button>
        }
      />

      {/* Payout Detail Modal */}
      <PayoutDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payout={payout}
      />
    </>
  );
}
