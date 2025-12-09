/**
 * Filename: OrganisationStudentCard.tsx
 * Purpose: Display organisation student information in detail card format with HubDetailCard
 * Created: 2025-12-06
 * Updated: 2025-12-06 - Added OrganisationStudentDetailModal for viewing all student fields
 * Specification: Organisation student card following HubDetailCard pattern (consistent with MemberCard)
 */
'use client';

import React, { useState } from 'react';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import OrganisationStudentDetailModal from './OrganisationStudentDetailModal';
import Button from '@/app/components/ui/actions/Button';
import getProfileImageUrl from '@/lib/utils/image';

interface OrganisationStudent {
  id: string;
  full_name?: string | null;
  email: string;
  avatar_url?: string | null;
  tutor_name?: string;
  tutor_id?: string;
  since: string;
}

interface OrganisationStudentCardProps {
  client: OrganisationStudent;
}

export default function OrganisationStudentCard({ client }: OrganisationStudentCardProps) {
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

  // Get image properties
  const image = {
    src: client.avatar_url ? getProfileImageUrl({
      id: client.id,
      avatar_url: client.avatar_url,
      full_name: client.full_name, // Use client name for initials
    }) : null,
    alt: client.full_name || 'Student',
    fallbackChar: client.full_name?.substring(0, 2).toUpperCase() || 'ST',
  };

  // Build title
  const title = client.full_name || client.email;

  // Build description
  const description = `Student of ${client.tutor_name || 'Unknown Tutor'}`;

  // Build details grid - 3x3 grid for balance with 160px avatar
  const details = [
    // Row 1: Name, Email, Status
    { label: 'Name', value: client.full_name || 'N/A' },
    { label: 'Email', value: client.email },
    { label: 'Status', value: 'Active' },
    // Row 2: Tutor, Since, -
    { label: 'Tutor', value: client.tutor_name || 'Unknown' },
    { label: 'Since', value: formatDate(client.since) },
    { label: '', value: '' },
    // Row 3: Student ID, -, -
    { label: 'Student ID', value: client.id.substring(0, 8) },
    { label: '', value: '' },
    { label: '', value: '' },
  ];

  return (
    <>
      <HubDetailCard
        image={image}
        title={title}
        description={description}
        details={details}
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            View Details
          </Button>
        }
      />

      {/* Student Detail Modal */}
      <OrganisationStudentDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={client}
      />
    </>
  );
}
