/**
 * Filename: apps/web/src/app/(authenticated)/my-students/page.tsx
 * Purpose: My Students page - Guardian Link management (SDD v5.0)
 * Created: 2025-11-12
 * Based on: /network/page.tsx (v4.4)
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyStudents, removeStudent } from '@/lib/api/students';
import type { StudentLink } from '@/types';
import StudentCard from '@/app/components/students/StudentCard';
import StudentInviteModal from '@/app/components/students/StudentInviteModal';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import toast from 'react-hot-toast';
import styles from './page.module.css';

export default function MyStudentsPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // React Query: Fetch students with automatic retry, caching, and background refetch
  const {
    data: students = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['students', profile?.id],
    queryFn: getMyStudents,
    enabled: !!profile && !profileLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Remove student mutation
  const removeMutation = useMutation({
    mutationFn: removeStudent,
    onMutate: async (linkId) => {
      await queryClient.cancelQueries({ queryKey: ['students', profile?.id] });
      const previousStudents = queryClient.getQueryData(['students', profile?.id]);

      queryClient.setQueryData(['students', profile?.id], (old: StudentLink[] = []) =>
        old.filter((s) => s.id !== linkId)
      );

      return { previousStudents };
    },
    onError: (err, linkId, context) => {
      queryClient.setQueryData(['students', profile?.id], context?.previousStudents);
      toast.error('Failed to remove student');
    },
    onSuccess: () => {
      toast.success('Student removed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['students', profile?.id] });
    },
  });

  const handleRemove = async (linkId: string) => {
    removeMutation.mutate(linkId);
  };

  const handleViewProgress = (studentId: string) => {
    // TODO: Navigate to student progress page
    toast('Student progress tracking coming soon!', { icon: '📊' });
  };

  const handleStudentInviteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['students', profile?.id] });
  };

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: students.length,
    };
  }, [students]);

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>My Students</h1>
            <p className={styles.subtitle}>Loading...</p>
          </div>
        </div>
        <ContextualSidebar>
          <div className={styles.statsCard}>
            <h3 className={styles.statsTitle}>Statistics</h3>
            <p className={styles.statsValue}>Loading...</p>
          </div>
        </ContextualSidebar>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>My Students</h1>
            <p className={styles.subtitle}>Failed to load students</p>
          </div>
          <div className={styles.errorState}>
            <p className={styles.errorText}>
              {(error as Error).message || 'An error occurred'}
            </p>
            <button onClick={() => refetch()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
        <ContextualSidebar>
          <div className={styles.statsCard}>
            <h3 className={styles.statsTitle}>Statistics</h3>
            <p className={styles.statsValue}>-</p>
          </div>
        </ContextualSidebar>
      </>
    );
  }

  // Determine role-specific messaging
  const isClient = profile?.roles.includes('client');
  const isTutor = profile?.roles.includes('tutor');

  const emptyStateTitle = isClient
    ? 'No students yet'
    : isTutor
    ? 'No students yet'
    : 'No students yet';

  const emptyStateMessage = isClient
    ? 'Add your child to start tracking their learning progress.'
    : isTutor
    ? 'Invite students to manage their learning path.'
    : 'Invited students will appear here.';

  return (
    <>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>My Students</h1>
          <p className={styles.subtitle}>
            {isClient
              ? 'Manage your children and track their learning progress'
              : 'Manage students and their learning progress'}
          </p>
        </div>

        {/* Quick Action */}
        <div className={styles.quickAction}>
          <button
            onClick={() => setIsModalOpen(true)}
            className={styles.addButton}
          >
            + Add Student
          </button>
        </div>

        {/* Content */}
        {students.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>{emptyStateTitle}</h3>
            <p className={styles.emptyText}>{emptyStateMessage}</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className={styles.emptyButton}
            >
              Add Your First Student
            </button>
          </div>
        ) : (
          <div className={styles.studentsList}>
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                currentUserId={profile?.id || ''}
                onRemove={handleRemove}
                onViewProgress={handleViewProgress}
              />
            ))}
          </div>
        )}

        {/* Student Invite Modal */}
        <StudentInviteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleStudentInviteSuccess}
        />
      </div>

      {/* Contextual Sidebar */}
      <ContextualSidebar>
        {/* Stats Card */}
        <div className={styles.statsCard}>
          <h3 className={styles.statsTitle}>Statistics</h3>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Total Students:</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className={styles.actionsCard}>
          <h3 className={styles.actionsTitle}>Quick Actions</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className={styles.actionButton}
          >
            <span className={styles.actionIcon}>➕</span>
            <span className={styles.actionText}>Add Student</span>
          </button>
        </div>
      </ContextualSidebar>
    </>
  );
}
