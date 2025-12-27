/*
 * Filename: src/app/components/referrals/ReferralCard.tsx
 * Purpose: Display referral lead information in detail card format with HubDetailCard
 * Created: 2025-11-02
 * Updated: 2025-12-06 - Added ReferralDetailModal for viewing all referral fields
 * Specification: Expanded detail card layout with HubDetailCard component
 */
'use client';

import React, { useState } from 'react';
import { Referral, ReferralStatus } from '@/types';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import ReferralDetailModal from './ReferralDetailModal';
import Button from '@/app/components/ui/actions/Button';
import getProfileImageUrl from '@/lib/utils/image';
import { getInitials } from '@/lib/utils/initials';
import { formatIdForDisplay } from '@/lib/utils/formatId';

interface ReferralCardProps {
  referral: Referral;
  onViewDetails?: (id: string) => void;
  onRemind?: (id: string) => void;
  onArchive?: (id: string) => void;
}

export default function ReferralCard({
  referral,
  onViewDetails,
  onRemind,
  onArchive
}: ReferralCardProps) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Map status to HubDetailCard status variant
  const getStatusVariant = (status: ReferralStatus): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
    switch (status) {
      case 'Converted':
        return 'success';
      case 'Signed Up':
        return 'info';
      case 'Expired':
        return 'error';
      case 'Referred':
      default:
        return 'neutral';
    }
  };

  // Get status description
  const getStatusDescription = (status: ReferralStatus): string => {
    switch (status) {
      case 'Referred':
        return 'Link clicked';
      case 'Signed Up':
        return 'Account created';
      case 'Converted':
        return 'First booking completed';
      case 'Expired':
        return 'Link expired';
      default:
        return '';
    }
  };

  // Get image properties
  const avatarUrl = referral.referred_user
    ? getProfileImageUrl({
        id: referral.referred_user.id,
        avatar_url: referral.referred_user.avatar_url,
        full_name: referral.referred_user.full_name, // Use referred user name for initials
      })
    : null;
  const fallbackChar = referral.referred_user ? getInitials(referral.referred_user.full_name, false) : '?';
  const imageHref = referral.referred_user ? `/public-profile/${referral.referred_user.id}` : undefined;

  // Build title
  const title = referral.referred_user?.full_name || 'Anonymous Lead';

  // Build description
  const description = getStatusDescription(referral.status);

  // Commission value
  const commissionValue = referral.first_commission
    ? `£${referral.first_commission.amount.toFixed(2)}`
    : '--';

  // Build details grid - 3x3 grid for balance with 160px avatar
  const details = [
    // Row 1: Status, Referred, Commission
    { label: 'Status', value: referral.status },
    { label: 'Referred', value: formatDate(referral.created_at) },
    { label: 'Commission', value: commissionValue },
    // Row 2: Converted, Service, --
    { label: 'Converted', value: referral.converted_at ? formatDate(referral.converted_at) : '--' },
    {
      label: 'Service',
      value: referral.status === 'Converted' && referral.first_booking ? referral.first_booking.service_name : '--'
    },
    { label: 'Lead Type', value: referral.referred_user ? 'Named' : 'Anonymous' },
    // Row 3: User ID, Link Status, Referral ID
    { label: 'User ID', value: referral.referred_user?.id ? formatIdForDisplay(referral.referred_user.id) : '--' },
    { label: 'Link Status', value: referral.status === 'Expired' ? 'Expired' : 'Active' },
    { label: 'Referral ID', value: formatIdForDisplay(referral.id) },
  ];

  // Build actions
  const actions = (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsModalOpen(true)}
      >
        View Details
      </Button>

      {/* Primary Action: Remind button for 'Referred' status */}
      {referral.status === 'Referred' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onRemind?.(referral.id)}
          disabled={!onRemind}
        >
          Remind
        </Button>
      )}

      {/* Archive button if handler provided */}
      {onArchive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onArchive(referral.id)}
        >
          Archive
        </Button>
      )}
    </>
  );

  return (
    <>
      <HubDetailCard
        image={{
          src: avatarUrl,
          alt: title,
          fallbackChar: fallbackChar,
        }}
        title={title}
        status={{
          label: referral.status,
          variant: getStatusVariant(referral.status),
        }}
        description={description}
        details={details}
        actions={actions}
        imageHref={imageHref}
        titleHref={onViewDetails ? undefined : imageHref}
      />

      {/* Referral Detail Modal */}
      <ReferralDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        referral={referral}
      />
    </>
  );
}
