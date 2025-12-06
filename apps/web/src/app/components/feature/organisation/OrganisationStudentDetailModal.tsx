/**
 * Filename: OrganisationStudentDetailModal.tsx
 * Purpose: Modal for displaying complete organisation student (client) details
 * Created: 2025-12-06
 * Specification: Uses HubDetailModal to show all student/client information
 */

'use client';

import React from 'react';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';

interface OrganisationStudent {
  id: string;
  full_name?: string | null;
  email: string;
  avatar_url?: string | null;
  tutor_name?: string;
  tutor_id?: string;
  since: string;
}

interface OrganisationStudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: OrganisationStudent;
}

export default function OrganisationStudentDetailModal({
  isOpen,
  onClose,
  student,
}: OrganisationStudentDetailModalProps) {
  // Format date helper (en-GB standard)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

  // Format datetime helper
  const formatDateTime = (dateString: string) => {
    return `${formatDate(dateString)} at ${formatTime(dateString)}`;
  };

  // Build subtitle
  const subtitle = `Student of ${student.tutor_name || 'Unknown Tutor'}`;

  // Build sections with all student fields
  const sections: DetailSection[] = [
    {
      title: 'Student Information',
      fields: [
        { label: 'Full Name', value: student.full_name || 'N/A' },
        { label: 'Email', value: student.email },
        { label: 'Status', value: 'Active' },
        { label: 'Student ID', value: student.id },
      ],
    },
    {
      title: 'Tutor Assignment',
      fields: [
        { label: 'Tutor Name', value: student.tutor_name || 'Unknown' },
        { label: 'Tutor ID', value: student.tutor_id || 'N/A' },
        { label: 'Assigned Since', value: formatDateTime(student.since) },
      ],
    },
  ];

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={student.full_name || student.email}
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
