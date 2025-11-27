/**
 * Filename: MemberCard.tsx
 * Purpose: Organisation member card following HubRowCard standard
 * Created: 2025-11-26
 * Design: 4-line rhythm with Identity, Narrative, Context, Performance
 */

'use client';

import React from 'react';
import HubRowCard from '@/app/components/ui/hub-row-card/HubRowCard';
import Button from '@/app/components/ui/Button';
import { OrganisationMember } from '@/lib/api/organisation';
import { formatTimeAgo } from '@/lib/utils/dateUtils';

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
  // Standardization: Alias for consistency with other Hub Row Cards
  const otherParty = member;

  // Line 1: Identity & Trust - Status Badge
  const isVerified =
    !!otherParty.dbs_certificate_url &&
    !!otherParty.identity_verification_document_url &&
    !!otherParty.address_verification_document_url;

  const status = isVerified
    ? { label: 'Verified', variant: 'success' as const }
    : { label: 'Unverified', variant: 'neutral' as const };

  // Line 2: Narrative - Description
  const description = otherParty.bio || 'There is no data available...';

  // Line 3: Context - Meta array
  const meta = [
    otherParty.role || 'Member',
    otherParty.location || 'Location not set',
    otherParty.commission_rate
      ? `${otherParty.commission_rate}% Comm.`
      : 'Default Comm.',
  ];

  // Line 4: Performance - Stats row
  const stats = (
    <div className="flex gap-3 text-xs text-gray-600">
      <span className="font-medium text-gray-900">
        Active Students: {otherParty.active_students_count || 0}
      </span>
      <span>•</span>
      <span className="font-medium text-green-700">
        Revenue: £{(otherParty.total_revenue || 0).toLocaleString()}
      </span>
      <span>•</span>
      <span>Last Session: {formatTimeAgo(otherParty.last_session_at)}</span>
    </div>
  );

  // Actions
  const actions = (
    <>
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
    <HubRowCard
      image={{
        src: otherParty.avatar_url,
        alt: otherParty.full_name || 'Team member',
        fallbackChar: otherParty.full_name?.charAt(0).toUpperCase() || '??',
      }}
      imageHref={`/public-profile/${otherParty.id}`}
      title={otherParty.full_name || otherParty.email}
      titleHref={`/public-profile/${otherParty.id}`}
      status={status}
      description={description}
      meta={meta}
      stats={stats}
      actions={actions}
    />
  );
}
