/**
 * Filename: apps/web/src/app/(authenticated)/my-students/page.tsx
 * Purpose: My Students page - Guardian Link management (SDD v5.0)
 * Created: 2025-11-12
 * Updated: 2025-11-13 - Enhanced with tab filtering, rich stats, and improved UX
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
import StudentStatsWidget from '@/app/components/students/StudentStatsWidget';
import ClientStudentWidget from '@/app/components/students/ClientStudentWidget';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import toast from 'react-hot-toast';
import styles from './page.module.css';

// Tab filter types
type TabType = 'all' | 'recently-added' | 'with-integrations';

export default function MyStudentsPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');

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

  // Calculate stats with rich metrics
  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentlyAdded = students.filter((s) => {
      const createdDate = new Date(s.created_at);
      return createdDate >= sevenDaysAgo;
    }).length;

    const withIntegrations = students.filter((s) => {
      // TODO: Check if student has integration links when that data is available
      return false; // Placeholder
    }).length;

    return {
      total: students.length,
      recentlyAdded,
      withIntegrations,
      activeThisMonth: 0, // Placeholder for future implementation
    };
  }, [students]);

  // Filter students based on active tab
  const filteredStudents = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (activeTab) {
      case 'recently-added':
        return students.filter((s) => {
          const createdDate = new Date(s.created_at);
          return createdDate >= sevenDaysAgo;
        });
      case 'with-integrations':
        return students.filter((s) => {
          // TODO: Filter by integration links when that data is available
          return false; // Placeholder - will show empty for now
        });
      case 'all':
      default:
        return students;
    }
  }, [students, activeTab]);

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>My Students</h1>
          <p className={styles.subtitle}>Loading...</p>
        </div>
        <ContextualSidebar>
          <StudentStatsWidget
            totalStudents={0}
            recentlyAdded={0}
            withIntegrations={0}
            activeThisMonth={0}
          />
        </ContextualSidebar>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>My Students</h1>
          <p className={styles.subtitle}>Failed to load students</p>
        </div>
        <div className={styles.content}>
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
          <StudentStatsWidget
            totalStudents={0}
            recentlyAdded={0}
            withIntegrations={0}
            activeThisMonth={0}
          />
        </ContextualSidebar>
      </>
    );
  }

  // Determine role-specific messaging
  const isClient = profile?.roles?.includes('client');
  const isTutor = profile?.roles?.includes('tutor');

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
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>My Students</h1>
        <p className={styles.subtitle}>
          {isClient
            ? 'Manage your children and track their learning progress'
            : 'Manage students and their learning progress'}
        </p>
      </div>

      {/* Filter Tabs - Always show */}
      <div className={styles.filterTabs}>
        <button
          onClick={() => setActiveTab('all')}
          className={`${styles.filterTab} ${activeTab === 'all' ? styles.filterTabActive : ''}`}
        >
          All Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('recently-added')}
          className={`${styles.filterTab} ${activeTab === 'recently-added' ? styles.filterTabActive : ''}`}
        >
          Recently Added ({stats.recentlyAdded})
        </button>
        <button
          onClick={() => setActiveTab('with-integrations')}
          className={`${styles.filterTab} ${activeTab === 'with-integrations' ? styles.filterTabActive : ''}`}
        >
          With Integrations ({stats.withIntegrations})
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
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
        ) : filteredStudents.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No students found</h3>
            <p className={styles.emptyText}>
              {activeTab === 'recently-added' && 'No students have been added in the last 7 days.'}
              {activeTab === 'with-integrations' && 'No students have connected integrations yet.'}
            </p>
            <button
              onClick={() => setActiveTab('all')}
              className={styles.emptyButton}
            >
              View All Students
            </button>
          </div>
        ) : (
          <div className={styles.studentsList}>
            {filteredStudents.map((student) => (
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
      </div>

      {/* Student Invite Modal */}
      <StudentInviteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleStudentInviteSuccess}
      />

      {/* Contextual Sidebar */}
      <ContextualSidebar>
        <StudentStatsWidget
          totalStudents={stats.total}
          recentlyAdded={stats.recentlyAdded}
          withIntegrations={stats.withIntegrations}
          activeThisMonth={stats.activeThisMonth}
        />

        <ClientStudentWidget
          onInviteByEmail={() => setIsModalOpen(true)}
          onImportStudent={() => toast('Bulk import coming soon!', { icon: '📤' })}
          onAddStudent={() => setIsModalOpen(true)}
          onCreateGroup={() => toast('Student groups coming soon!', { icon: '📁' })}
        />
      </ContextualSidebar>
    </>
  );
}
