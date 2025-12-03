/*
 * Filename: src/app/components/referrals/ReferralCard.tsx
 * Purpose: Display referral lead information in card format (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-24 - Migrated to HubRowCard standard
 * Specification: SDD v3.6, Section 4.3 - /referrals hub UI
 */
'use client';

import { Referral, ReferralStatus } from '@/types';
import HubRowCard from '@/app/components/hub/content/HubRowCard/HubRowCard';
import StatsRow from '@/app/components/hub/content/HubRowCard/StatsRow';
import Button from '@/app/components/ui/actions/Button';
import getProfileImageUrl from '@/lib/utils/image';

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
  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Map status to HubRowCard status variant
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
    ? getProfileImageUrl(referral.referred_user)
    : null;
  const fallbackChar = referral.referred_user ? referral.referred_user.full_name?.charAt(0).toUpperCase() : '?';
  const imageHref = referral.referred_user ? `/public-profile/${referral.referred_user.id}` : undefined;

  // Build title
  const title = referral.referred_user?.full_name || 'Anonymous Lead';

  // Build description
  const description = getStatusDescription(referral.status);

  // Build metadata array
  const meta = [
    `Referred: ${formatDate(referral.created_at)}`,
    referral.converted_at ? `Converted: ${formatDate(referral.converted_at)}` : null,
    referral.status === 'Converted' && referral.first_booking ? `Service: ${referral.first_booking.service_name}` : null,
  ].filter(Boolean) as string[];

  // Build stats (Commission) - converted from columnar to inline bullet-separated
  const commissionColor = referral.first_commission ? '#137333' : '#9ca3af'; // emerald-600 : gray-400
  const commissionValue = referral.first_commission
    ? `£${referral.first_commission.amount.toFixed(2)}`
    : '--';

  const stats = (
    <StatsRow
      stats={[
        { label: 'Commission', value: commissionValue, color: commissionColor },
        // Future: Add more stats here
        // { label: 'Status', value: referral.status },
        // { label: 'Converted', value: referral.converted_at ? formatDate(referral.converted_at) : '--' },
      ]}
    />
  );

  // Build actions
  const actions = (
    <>
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

      {/* Always show View Details */}
      {onViewDetails && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onViewDetails(referral.id)}
        >
          View Details
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
    <HubRowCard
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
      meta={meta}
      stats={stats}
      actions={actions}
      imageHref={imageHref}
      titleHref={onViewDetails ? undefined : imageHref}
    />
  );
}
