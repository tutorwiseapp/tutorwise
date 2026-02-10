/**
 * Filename: StudentDetailModal.tsx
 * Purpose: Modal for displaying complete student (Guardian Link) details
 * Created: 2025-12-06
 * Specification: Uses HubDetailModal to show all student information
 */

'use client';

import React from 'react';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';
import { calculateAge } from '@/lib/utils/dateUtils';
import type { StudentCardData } from './StudentCard';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentCardData;
}

export default function StudentDetailModal({
  isOpen,
  onClose,
  student,
}: StudentDetailModalProps) {
  // Safety check
  if (!student.student) {
    return null;
  }

  const profile = student.student;

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

  const age = profile.date_of_birth ? calculateAge(profile.date_of_birth) : null;

  // Build subtitle
  const subtitle = profile.email;

  // Learning preferences come from role_details (role_type='client'), exposed via professional_details.client
  const clientDetails = (profile as any).professional_details?.client;

  // Build sections
  const sections: DetailSection[] = [
    {
      title: 'Student Information',
      fields: [
        { label: 'Full Name', value: profile.full_name },
        { label: 'Email', value: profile.email },
        { label: 'Age', value: age ? `${age} years old` : 'Not specified' },
        { label: 'Date of Birth', value: profile.date_of_birth ? formatDate(profile.date_of_birth) : 'Not specified' },
        { label: 'Status', value: 'Active' },
        { label: 'Student ID', value: profile.id },
      ],
    },
    {
      title: 'Education & Learning',
      fields: [
        { label: 'Subjects', value: clientDetails?.subjects?.join(', ') || 'Not specified' },
        { label: 'Learning Goals', value: clientDetails?.goals?.join(', ') || 'Not specified' },
        { label: 'Learning Style', value: clientDetails?.learning_style || 'Not specified' },
        { label: 'Budget Range', value: clientDetails?.budget_range ? `£${clientDetails.budget_range.min}–£${clientDetails.budget_range.max} / hr` : 'Not specified' },
      ],
    },
    {
      title: 'Contact & Location',
      fields: [
        { label: 'Phone', value: (profile as any).phone || 'Not provided' },
        { label: 'City', value: (profile as any).city || 'Not specified' },
        { label: 'Postcode', value: (profile as any).postal_code || 'Not specified' },
        { label: 'Country', value: (profile as any).country || 'Not specified' },
        { label: 'Timezone', value: (profile as any).timezone || 'Not specified' },
      ],
    },
    {
      title: 'Guardian Link Information',
      fields: [
        { label: 'Link ID', value: student.id },
        { label: 'Guardian ID', value: student.guardian_id },
        { label: 'Linked Since', value: formatDateTime(student.created_at) },
        { label: 'Link Status', value: student.status.charAt(0).toUpperCase() + student.status.slice(1) },
        { label: 'Relationship', value: (student as any).relationship || 'Guardian' },
      ],
    },
  ];

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={profile.full_name}
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
