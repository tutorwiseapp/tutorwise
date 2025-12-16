/**
 * Filename: ReferralDetailModal.tsx
 * Purpose: Modal for displaying complete referral details
 * Created: 2025-12-06
 * Specification: Uses HubDetailModal to show all referral information
 */

'use client';

import React from 'react';
import { Referral } from '@/types';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';

interface ReferralDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: Referral;
}

export default function ReferralDetailModal({
  isOpen,
  onClose,
  referral,
}: ReferralDetailModalProps) {
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

  // Get status description
  const getStatusDescription = (status: string): string => {
    switch (status) {
      case 'Referred':
        return 'Link clicked - waiting for signup';
      case 'Signed Up':
        return 'Account created - waiting for first booking';
      case 'Converted':
        return 'First booking completed - commission earned';
      case 'Expired':
        return 'Link expired - no longer active';
      default:
        return '';
    }
  };

  // Build subtitle
  const subtitle = referral.referred_user?.full_name || 'Anonymous Referral Lead';

  // Build sections
  const sections: DetailSection[] = [
    {
      title: 'Referral Information',
      fields: [
        { label: 'Referral ID', value: referral.id },
        { label: 'Status', value: referral.status },
        { label: 'Status Description', value: getStatusDescription(referral.status) },
        { label: 'Lead Type', value: referral.referred_user ? 'Named Lead' : 'Anonymous Lead' },
        { label: 'Link Status', value: referral.status === 'Expired' ? 'Expired' : 'Active' },
      ],
    },
    {
      title: 'Referred User',
      fields: [
        { label: 'Full Name', value: referral.referred_user?.full_name || 'Not available (anonymous)' },
        { label: 'User ID', value: referral.referred_profile_id || 'N/A' },
      ],
    },
    {
      title: 'Timeline',
      fields: [
        { label: 'Link Sent/Clicked', value: formatDateTime(referral.created_at) },
        { label: 'Converted At', value: referral.converted_at ? formatDateTime(referral.converted_at) : 'Not yet converted' },
      ],
    },
  ];

  // Add First Booking section if converted
  if (referral.status === 'Converted' && referral.first_booking) {
    sections.push({
      title: 'First Booking (Conversion)',
      fields: [
        { label: 'Booking ID', value: referral.booking_id || 'N/A' },
        { label: 'Service Name', value: referral.first_booking.service_name },
        { label: 'Booking Amount', value: `£${referral.first_booking.amount.toFixed(2)}` },
      ],
    });
  }

  // Add Commission section if earned
  if (referral.first_commission) {
    sections.push({
      title: 'Commission Earned',
      fields: [
        { label: 'Commission ID', value: referral.first_commission.id },
        { label: 'Transaction ID', value: referral.transaction_id || 'N/A' },
        { label: 'Commission Amount', value: `£${referral.first_commission.amount.toFixed(2)}` },
      ],
    });
  }

  // Add Agent Information section
  sections.push({
    title: 'Agent Information',
    fields: [
      { label: 'Agent ID', value: referral.agent_id },
    ],
  });

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="Referral Details"
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
