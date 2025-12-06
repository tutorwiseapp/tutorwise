/**
 * Filename: DisputeCard.tsx
 * Purpose: Display dispute information in detail card format with HubDetailCard
 * Created: 2025-12-06
 * Updated: 2025-12-06 - Added DisputeDetailModal for viewing all transaction fields
 * Specification: Dispute card following HubDetailCard pattern (consistent with TransactionCard)
 */
'use client';

import React, { useState } from 'react';
import { Transaction } from '@/types';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import DisputeDetailModal from './DisputeDetailModal';
import Button from '@/app/components/ui/actions/Button';

interface DisputeCardProps {
  dispute: Transaction;
}

export default function DisputeCard({ dispute }: DisputeCardProps) {
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
    const status = dispute.status?.toLowerCase() || '';

    if (status === 'won' || status === 'resolved') {
      return { label: dispute.status || 'Resolved', variant: 'success' };
    }
    if (status === 'under_review' || status === 'disputed' || status === 'pending') {
      return { label: dispute.status || 'Disputed', variant: 'warning' };
    }
    if (status === 'lost' || status === 'failed') {
      return { label: dispute.status || 'Lost', variant: 'error' };
    }

    return { label: dispute.status || 'Disputed', variant: 'warning' };
  };

  // Get client info (placeholder for now - will be populated from backend)
  const clientName = 'Client'; // TODO: Get from dispute.booking?.client?.full_name
  const clientInitial = 'C';

  // Get image properties (client avatar or fallback)
  const image = {
    src: null, // TODO: Get from dispute.booking?.client?.avatar_url
    alt: clientName,
    fallbackChar: clientInitial,
  };

  // Build title
  const title = `£${Math.abs(dispute.amount).toFixed(2)} Disputed`;

  // Build description
  const description = dispute.description || 'Payment Dispute';

  // Build details grid - 3x3 grid for balance with 160px avatar
  const details = [
    // Row 1: Amount, Status, Type
    { label: 'Amount', value: `£${Math.abs(dispute.amount).toFixed(2)}` },
    { label: 'Status', value: dispute.status || 'Disputed' },
    { label: 'Type', value: dispute.type || 'Dispute' },
    // Row 2: Client, Date, Time
    { label: 'Client', value: clientName },
    { label: 'Date', value: formatDate(dispute.created_at) },
    { label: 'Time', value: formatTime(dispute.created_at) },
    // Row 3: Reference, Reason, -
    { label: 'Reference', value: dispute.stripe_payout_id || 'N/A' },
    { label: 'Reason', value: dispute.description || 'N/A' },
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
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
              View Details
            </Button>
            <Button variant="secondary" size="sm" disabled>
              Submit Evidence
            </Button>
          </>
        }
      />

      {/* Dispute Detail Modal */}
      <DisputeDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dispute={dispute}
      />
    </>
  );
}
