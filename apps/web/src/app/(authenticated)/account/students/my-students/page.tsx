/**
 * Filename: apps/web/src/app/(authenticated)/account/students/my-students/page.tsx
 * Purpose: My Students hub page - List all linked students (Guardian Link v5.0)
 * Created: 2026-02-08
 * Pattern: Uses HubPageLayout with HubHeader, React Query (aligned with Hub Architecture)
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountCompletenessWidget from '@/app/components/feature/account/AccountCompletenessWidget';
import MyStudentStatsWidget from '@/app/components/feature/students/MyStudentStatsWidget';
import MyStudentHelpWidget from '@/app/components/feature/students/MyStudentHelpWidget';
import MyStudentTipWidget from '@/app/components/feature/students/MyStudentTipWidget';
import MyStudentVideoWidget from '@/app/components/feature/students/MyStudentVideoWidget';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import Button from '@/app/components/ui/actions/Button';
import StudentInviteModal from '@/app/components/feature/students/StudentInviteModal';
import toast from 'react-hot-toast';
import { calculateAge } from '@/lib/utils/dateUtils';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

interface StudentLink {
  id: string;
  student_id: string;
  guardian_id: string;
  status: string;
  created_at: string;
  student: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    date_of_birth?: string;
  };
}

async function getMyStudents(): Promise<StudentLink[]> {
  const response = await fetch('/api/links/client-student');
  if (!response.ok) throw new Error('Failed to fetch students');
  const data = await response.json();
  return data.students || [];
}

async function getStudentStats() {
  const response = await fetch('/api/students/stats');
  if (!response.ok) throw new Error('Failed to fetch student stats');
  const data = await response.json();
  return data.stats;
}

export default function MyStudentsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // React Query: Fetch students with automatic retry, caching, and background refetch
  const {
    data: students = [],
    isLoading,
    isFetching: _isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['students', profile?.id],
    queryFn: getMyStudents,
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // React Query: Fetch student stats
  const { data: studentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['student-stats', profile?.id],
    queryFn: getStudentStats,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase();
    return students.filter((link: StudentLink) => {
      const fullName = link.student.full_name?.toLowerCase() || '';
      const email = link.student.email?.toLowerCase() || '';
      return fullName.includes(query) || email.includes(query);
    });
  }, [students, searchQuery]);

  // Action handlers
  const handleInviteStudent = () => {
    setShowInviteModal(true);
    setShowActionsMenu(false);
  };

  const handleInviteSuccess = () => {
    // Invalidate and refetch students query to show the new student
    queryClient.invalidateQueries({ queryKey: ['students', profile?.id] });
    refetch();
  };

  const handleViewStudent = (studentId: string) => {
    router.push(`/account/students/${studentId}/overview`);
  };

  const handleManageInvitations = () => {
    router.push('/account/students/invitations');
    setShowActionsMenu(false);
  };

  const handleExportCSV = () => {
    if (!filteredStudents.length) {
      toast.error('No students to export');
      return;
    }

    const headers = ['Name', 'Email', 'Age', 'Linked Since'];
    const rows = filteredStudents.map((link: StudentLink) => [
      link.student.full_name || '',
      link.student.email || '',
      link.student.date_of_birth ? calculateAge(link.student.date_of_birth).toString() : '',
      new Date(link.created_at).toLocaleDateString('en-GB'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `my-students-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Students exported successfully');
    setShowActionsMenu(false);
  };

  // Tabs
  const tabs: HubTab[] = [
    { id: 'my-students', label: 'My Students', count: students.length, active: true },
  ];

  const handleTabChange = (_tabId: string) => {
    // Future: Add more tabs if needed
  };

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="My Students" />}
        sidebar={
          <HubSidebar>
            <AccountCompletenessWidget />
            <MyStudentHelpWidget />
            <MyStudentTipWidget context="my-students" />
            <MyStudentVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading students...</div>
      </HubPageLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="My Students" />}
        sidebar={
          <HubSidebar>
            <AccountCompletenessWidget />
            <MyStudentHelpWidget />
            <MyStudentTipWidget context="my-students" />
            <MyStudentVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.error}>
          <p>Failed to load students</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="My Students"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
            </div>
          }
          actions={
            <>
              {/* Primary Action Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleInviteStudent}
              >
                Invite Student
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  square
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={handleManageInvitations}
                        className={actionStyles.menuButton}
                      >
                        Manage Invitations
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className={actionStyles.menuButton}
                      >
                        Export CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <AccountCompletenessWidget />
          {studentStats && (
            <MyStudentStatsWidget stats={studentStats} isLoading={statsLoading} />
          )}
          <MyStudentHelpWidget />
          <MyStudentTipWidget context="my-students" studentCount={students.length} />
          <MyStudentVideoWidget />
        </HubSidebar>
      }
    >
      {/* Empty State */}
      {filteredStudents.length === 0 && (
        <HubEmptyState
          title={searchQuery ? 'No students found' : 'No Students Yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query.'
              : 'Invite students to get started. They\'ll receive an email invitation to create their account.'
          }
          actionLabel={searchQuery ? undefined : 'Invite Your First Student'}
          onAction={searchQuery ? undefined : handleInviteStudent}
        />
      )}

      {/* Students List */}
      {filteredStudents.length > 0 && (
        <div className={styles.studentsList}>
          {filteredStudents.map((link: StudentLink) => {
            const avatarUrl = getProfileImageUrl(
              {
                id: link.student.id,
                avatar_url: link.student.avatar_url,
                full_name: link.student.full_name,
              },
              false
            );
            const fallbackChar =
              link.student.full_name?.substring(0, 2).toUpperCase() || '??';

            const details = [
              { label: 'Email', value: link.student.email || 'Not provided' },
              {
                label: 'Age',
                value: link.student.date_of_birth
                  ? `${calculateAge(link.student.date_of_birth)} years old`
                  : 'Not provided',
              },
              {
                label: 'Linked Since',
                value: new Date(link.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
              },
              { label: 'Status', value: link.status || 'Active' },
            ];

            const actions = (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleViewStudent(link.student_id)}
              >
                Manage Profile
              </Button>
            );

            return (
              <HubDetailCard
                key={link.id}
                image={{ src: avatarUrl, alt: link.student.full_name, fallbackChar }}
                title={link.student.full_name}
                status={{ label: 'Active', variant: 'success' }}
                details={details}
                actions={actions}
                titleHref={`/account/students/${link.student_id}/overview`}
              />
            );
          })}
        </div>
      )}

      {/* Invite Student Modal */}
      <StudentInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />
    </HubPageLayout>
  );
}
