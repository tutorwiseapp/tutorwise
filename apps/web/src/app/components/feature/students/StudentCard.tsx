/**
 * Filename: apps/web/src/app/components/students/StudentCard.tsx
 * Purpose: Display individual student (Guardian Link) in detail card format with HubDetailCard
 * Created: 2025-11-12
 * Updated: 2025-12-06 - Added StudentDetailModal for viewing all student fields
 */

'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import StudentDetailModal from './StudentDetailModal';
import Button from '@/app/components/ui/actions/Button';
import getProfileImageUrl from '@/lib/utils/image';

export interface StudentCardData {
  id: string; // profile_graph.id
  guardian_id: string;
  student_id: string;
  status: 'active';
  created_at: string;
  student?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    date_of_birth?: string;
  };
}

interface StudentCardProps {
  student: StudentCardData;
  currentUserId: string;
  onRemove?: (linkId: string) => Promise<void>;
  onViewProgress?: (studentId: string) => void;
}

export default function StudentCard({
  student,
  currentUserId,
  onRemove,
  onViewProgress,
}: StudentCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Safety check
  if (!student.student) {
    return null;
  }

  const profile = student.student;

  // Calculate age from date_of_birth
  const getAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = getAge(profile.date_of_birth);
  const joinedYear = new Date(student.created_at).getFullYear();

  // Handle remove action
  const handleRemove = async () => {
    if (!onRemove) return;
    const confirmed = window.confirm(
      `Are you sure you want to remove ${profile.full_name} from your students? This will not delete their account, only unlink them from yours.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await onRemove(student.id);
      toast.success('Student removed');
    } catch (error) {
      toast.error('Failed to remove student');
    } finally {
      setIsLoading(false);
    }
  };

  // Image properties
  const avatarUrl = profile.avatar_url
    ? getProfileImageUrl({
        id: profile.id,
        avatar_url: profile.avatar_url,
        full_name: profile.full_name, // Use student name for initials
      })
    : null;

  const fallbackChar = profile.full_name?.charAt(0).toUpperCase() || '?';

  // Build details grid - 2 rows
  const details = [
    // Row 1: Age, Joined, Status
    { label: 'Age', value: age ? `${age}` : '--' },
    { label: 'Joined', value: `${joinedYear}` },
    { label: 'Status', value: 'Active' },
    // Row 2: Linked, Email (full width)
    {
      label: 'Linked',
      value: new Date(student.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    },
    { label: 'Email', value: profile.email, fullWidth: true },
  ];

  // Actions component
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
        onClick={() => onViewProgress?.(profile.id)}
      >
        View Progress
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        disabled={isLoading}
      >
        {isLoading ? 'Removing...' : 'Remove'}
      </Button>
    </>
  );

  return (
    <>
      <HubDetailCard
        image={{
          src: avatarUrl,
          alt: profile.full_name,
          fallbackChar: fallbackChar,
        }}
        imageHref={`/public-profile/${profile.id}`}
        title={profile.full_name}
        titleHref={`/public-profile/${profile.id}`}
        status={{
          label: 'Active',
          variant: 'success',
        }}
        description={profile.email}
        details={details}
        actions={actions}
      />

      {/* Student Detail Modal */}
      <StudentDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={student}
      />
    </>
  );
}
