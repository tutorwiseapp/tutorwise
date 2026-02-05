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
  // Extended fields
  phone?: string;
  education_level?: string;
  subjects?: string[];
  key_stages?: string[];
  learning_goals?: string[];
  learning_preferences?: string[];
  special_needs?: string[];
  sessions_completed?: number;
  last_session_at?: string;
  total_spent?: number;
  notes?: string;
  location_city?: string;
  location_postcode?: string;
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

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return '£0.00';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  // Build sections with all student fields
  const sections: DetailSection[] = [
    {
      title: 'Student Information',
      fields: [
        { label: 'Full Name', value: student.full_name || 'N/A' },
        { label: 'Email', value: student.email },
        { label: 'Phone', value: student.phone || 'Not provided' },
        { label: 'Location', value: [student.location_city, student.location_postcode].filter(Boolean).join(', ') || 'Not specified' },
        { label: 'Status', value: 'Active' },
        { label: 'Student ID', value: student.id },
      ],
    },
    {
      title: 'Education & Learning',
      fields: [
        { label: 'Education Level', value: student.education_level || 'Not specified' },
        { label: 'Subjects', value: student.subjects?.join(', ') || 'Not specified' },
        { label: 'Key Stages', value: student.key_stages?.join(', ') || 'Not specified' },
        { label: 'Learning Goals', value: student.learning_goals?.join(', ') || 'Not specified' },
        { label: 'Learning Preferences', value: student.learning_preferences?.join(', ') || 'Not specified' },
        ...(student.special_needs && student.special_needs.length > 0 ? [{ label: 'Special Educational Needs', value: student.special_needs.join(', ') }] : []),
      ],
    },
    {
      title: 'Session History',
      fields: [
        { label: 'Sessions Completed', value: `${student.sessions_completed || 0} sessions` },
        { label: 'Last Session', value: student.last_session_at ? formatDateTime(student.last_session_at) : 'No sessions yet' },
        { label: 'Total Spent', value: formatCurrency(student.total_spent) },
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
    ...(student.notes ? [{
      title: 'Notes',
      fields: [
        { label: 'Internal Notes', value: student.notes },
      ],
    }] : []),
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
