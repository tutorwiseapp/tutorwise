/**
 * Filename: MemberCard.tsx
 * Purpose: Organisation member card in detail card format with HubDetailCard
 * Created: 2025-11-26
 * Updated: 2025-12-06 - Added MemberDetailModal for viewing all member fields
 */

'use client';

import React, { useState } from 'react';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import MemberDetailModal from './MemberDetailModal';
import Button from '@/app/components/ui/actions/Button';
import { OrganisationMember } from '@/lib/api/organisation';
import { formatTimeAgo } from '@/lib/utils/dateUtils';
import { getInitials } from '@/lib/utils/initials';
import { formatIdForDisplay } from '@/lib/utils/formatId';

interface MemberCardProps {
  member: OrganisationMember;
  onMessage: (memberId: string) => void;
  onRemove: (memberId: string, memberName: string) => void;
  onManage: (member: OrganisationMember) => void;
}

export default function MemberCard({
  member,
  onMessage,
  onRemove,
  onManage,
}: MemberCardProps) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Standardization: Alias for consistency with other Hub Row Cards
  const otherParty = member;

  // Identity & Trust - Status Badge
  const isVerified =
    !!otherParty.dbs_certificate_url &&
    !!otherParty.identity_verification_document_url;

  const status = isVerified
    ? { label: 'Verified', variant: 'success' as const }
    : { label: 'Unverified', variant: 'neutral' as const };

  // Description
  const description = otherParty.bio || 'There is no data available...';

  // Build details grid - 3x3 grid for balance with 160px avatar
  const details = [
    // Row 1: Role, Location, Commission
    { label: 'Role', value: otherParty.role || 'Member' },
    { label: 'Location', value: otherParty.location || 'Not set' },
    {
      label: 'Commission',
      value: otherParty.commission_rate ? `${otherParty.commission_rate}%` : 'Default'
    },
    // Row 2: Active Students, Revenue, Last Session
    { label: 'Students', value: `${otherParty.active_students_count || 0}` },
    { label: 'Revenue', value: `£${(otherParty.total_revenue || 0).toLocaleString()}` },
    { label: 'Last Session', value: formatTimeAgo(otherParty.last_session_at) },
    // Row 3: Email, Verified, ID
    { label: 'Email', value: otherParty.email },
    { label: 'Verified', value: isVerified ? 'Yes' : 'No' },
    { label: 'ID', value: formatIdForDisplay(otherParty.id) },
  ];

  // Actions
  const actions = (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsModalOpen(true)}
      >
        View Details
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onManage(otherParty)}
      >
        Manage
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onRemove(otherParty.id, otherParty.full_name || otherParty.email)}
      >
        Remove
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => onMessage(otherParty.id)}
      >
        Message
      </Button>
    </>
  );

  return (
    <>
      <HubDetailCard
        image={{
          src: otherParty.avatar_url,
          alt: otherParty.full_name || 'Team member',
          fallbackChar: getInitials(otherParty.full_name),
        }}
        imageHref={`/public-profile/${otherParty.id}`}
        title={otherParty.full_name || otherParty.email}
        titleHref={`/public-profile/${otherParty.id}`}
        status={status}
        description={description}
        details={details}
        actions={actions}
      />

      {/* Member Detail Modal */}
      <MemberDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        member={member}
      />
    </>
  );
}
