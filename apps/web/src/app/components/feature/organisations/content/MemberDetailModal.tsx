/**
 * Filename: MemberDetailModal.tsx
 * Purpose: Modal for displaying complete organisation member details
 * Created: 2025-12-06
 * Specification: Uses HubDetailModal to show all member information
 */

'use client';

import React from 'react';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';
import type { OrganisationMember } from '@/lib/api/organisation';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: OrganisationMember;
}

export default function MemberDetailModal({
  isOpen,
  onClose,
  member,
}: MemberDetailModalProps) {
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

  // Check verification status
  const isVerified =
    !!member.dbs_certificate_url &&
    !!member.identity_verification_document_url;

  // Build subtitle
  const subtitle = member.role || 'Team Member';

  // Build sections
  const sections: DetailSection[] = [
    {
      title: 'Member Information',
      fields: [
        { label: 'Full Name', value: member.full_name || 'Not provided' },
        { label: 'Email', value: member.email },
        { label: 'Phone', value: (member as any).phone || 'Not provided' },
        { label: 'Role', value: member.role || 'Member' },
        { label: 'Location', value: member.location || 'Not specified' },
        { label: 'Bio', value: member.bio || 'No bio provided' },
        { label: 'Member ID', value: member.id },
      ],
    },
    {
      title: 'Teaching Profile',
      fields: [
        { label: 'Subjects', value: (member as any).subjects?.join(', ') || 'Not specified' },
        { label: 'Key Stages', value: (member as any).key_stages?.join(', ') || 'Not specified' },
        { label: 'Teaching Experience', value: (member as any).teaching_experience || 'Not specified' },
        { label: 'Qualifications', value: (member as any).qualifications?.join(', ') || 'Not specified' },
        { label: 'Hourly Rate', value: (member as any).hourly_rate ? `£${(member as any).hourly_rate}` : 'Not set' },
        { label: 'Delivery Mode', value: (member as any).delivery_mode || 'Not specified' },
      ],
    },
    {
      title: 'Verification Status',
      fields: [
        { label: 'Overall Status', value: isVerified ? 'Verified' : 'Unverified' },
        { label: 'Is Verified', value: member.is_verified ? 'Yes' : 'No' },
        { label: 'DBS Certificate', value: member.dbs_certificate_url ? 'Uploaded' : 'Not uploaded' },
        { label: 'Identity Document', value: member.identity_verification_document_url ? 'Uploaded' : 'Not uploaded' },
        { label: 'Proof of Address', value: (member as any).proof_of_address_url ? 'Uploaded' : 'Not uploaded' },
      ],
    },
    {
      title: 'Performance & Analytics',
      fields: [
        { label: 'Active Students', value: `${member.active_students_count || 0}` },
        { label: 'Total Sessions', value: `${(member as any).total_sessions_count || 0}` },
        { label: 'Total Revenue', value: `£${(member.total_revenue || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Average Rating', value: (member as any).average_rating ? `${(member as any).average_rating.toFixed(1)} / 5.0` : 'No ratings yet' },
        { label: 'Total Reviews', value: `${(member as any).total_reviews_count || 0}` },
        { label: 'Last Session', value: member.last_session_at ? formatDateTime(member.last_session_at) : 'No sessions yet' },
      ],
    },
    {
      title: 'Commission & Settings',
      fields: [
        { label: 'Commission Rate', value: member.commission_rate ? `${member.commission_rate}%` : 'Using organisation default' },
        { label: 'Payment Status', value: (member as any).payment_status || 'Active' },
        { label: 'Internal Notes', value: member.internal_notes || 'No notes' },
      ],
    },
    {
      title: 'Organisation Membership',
      fields: [
        { label: 'Connection ID', value: member.connection_id },
        { label: 'Added At', value: formatDateTime(member.added_at) },
        { label: 'Status', value: (member as any).membership_status || 'Active' },
        { label: 'Last Active', value: (member as any).last_active_at ? formatDateTime((member as any).last_active_at) : 'Not available' },
      ],
    },
  ];

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={member.full_name || member.email}
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
