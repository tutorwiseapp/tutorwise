/**
 * Filename: apps/web/src/app/(authenticated)/my-students/page.tsx
 * Purpose: My Students page - Guardian Link management (SDD v5.0)
 * Created: 2025-11-12
 * Updated: 2025-12-03 - Migrated to HubEmptyState component (Phase 2 migration complete)
 * Based on: /network/page.tsx (Hub Architecture)
 * Change History:
 * C003 - 2025-12-03 : Migrated to HubEmptyState component, removed custom empty state markup
 * C002 - 2025-11-29 : Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs, HubPagination
 * C001 - 2025-11-12 : Initial creation
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyStudents, removeStudent } from '@/lib/api/students';
import type { StudentLink } from '@/types';
import StudentCard from '@/app/components/feature/students/StudentCard';
import StudentInviteModal from '@/app/components/feature/students/StudentInviteModal';
import StudentStatsWidget from '@/app/components/feature/students/StudentStatsWidget';
import MyStudentHelpWidget from '@/app/components/feature/students/MyStudentHelpWidget';
import MyStudentTipWidget from '@/app/components/feature/students/MyStudentTipWidget';
import MyStudentVideoWidget from '@/app/components/feature/students/MyStudentVideoWidget';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

// Tab filter types
type TabType = 'all' | 'recently-added' | 'with-integrations';
type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 5;

export default function MyStudentsPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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
    if (!students) return { total: 0, recentlyAdded: 0, withIntegrations: 0, activeThisMonth: 0 };

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

  // Action handlers
  const handleInviteStudent = () => {
    setIsModalOpen(true);
    setShowActionsMenu(false);
  };

  const handleImportStudents = () => {
    toast('Bulk import coming soon!', { icon: '📤' });
    setShowActionsMenu(false);
  };

  const handleCreateGroup = () => {
    toast('Student groups coming soon!', { icon: '📁' });
    setShowActionsMenu(false);
  };

  const handleExportCSV = () => {
    if (!filteredStudents.length) {
      toast.error('No students to export');
      return;
    }

    const headers = ['Name', 'Email', 'Added On', 'Status'];
    const rows = filteredStudents.map(student => [
      student.student?.full_name || '',
      student.student?.email || '',
      new Date(student.created_at).toLocaleDateString('en-GB'),
      student.status || 'active',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Students exported successfully');
    setShowActionsMenu(false);
  };

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    if (!students) return [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Tab filtering
    let filtered = students.filter((student) => {
      switch (activeTab) {
        case 'recently-added':
          const createdDate = new Date(student.created_at);
          return createdDate >= sevenDaysAgo;
        case 'with-integrations':
          // TODO: Filter by integration links when that data is available
          return false; // Placeholder
        case 'all':
        default:
          return true;
      }
    });

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((student) => {
        const name = student.student?.full_name?.toLowerCase() || '';
        const email = student.student?.email?.toLowerCase() || '';
        return name.includes(query) || email.includes(query);
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return (a.student?.full_name || '').localeCompare(b.student?.full_name || '');
        case 'name-desc':
          return (b.student?.full_name || '').localeCompare(a.student?.full_name || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [students, activeTab, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortBy]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabType);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Determine role-specific messaging
  const isClient = profile?.roles?.includes('client');

  const emptyStateTitle = 'No students yet';
  const emptyStateMessage = isClient
    ? 'Add your child to start tracking their learning progress.'
    : 'Invite students to manage their learning path.';

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="My Students" />}
        sidebar={
          <HubSidebar>
            <StudentStatsWidget
              totalStudents={0}
              recentlyAdded={0}
              withIntegrations={0}
              activeThisMonth={0}
            />
            <MyStudentHelpWidget />
            <MyStudentTipWidget />
            <MyStudentVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading students...</p>
        </div>
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
            <StudentStatsWidget
              totalStudents={0}
              recentlyAdded={0}
              withIntegrations={0}
              activeThisMonth={0}
            />
            <MyStudentHelpWidget />
            <MyStudentTipWidget />
            <MyStudentVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.errorState}>
          <p className={styles.errorText}>
            {(error as Error).message || 'An error occurred'}
          </p>
          <button onClick={() => refetch()} className={styles.retryButton}>
            Try Again
          </button>
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

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className={filterStyles.filterSelect}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          }
          actions={
            <>
              {/* Primary Action Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
              >
                Add Student
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
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
                        onClick={handleInviteStudent}
                        className={actionStyles.menuButton}
                      >
                        Invite by Email
                      </button>
                      <button
                        onClick={handleImportStudents}
                        className={actionStyles.menuButton}
                      >
                        Import Students
                      </button>
                      <button
                        onClick={handleCreateGroup}
                        className={actionStyles.menuButton}
                      >
                        Create Group
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
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Students', count: stats.total, active: activeTab === 'all' },
            { id: 'recently-added', label: 'Recently Added', count: stats.recentlyAdded, active: activeTab === 'recently-added' },
            { id: 'with-integrations', label: 'With Integrations', count: stats.withIntegrations, active: activeTab === 'with-integrations' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <StudentStatsWidget
            totalStudents={stats.total}
            recentlyAdded={stats.recentlyAdded}
            withIntegrations={stats.withIntegrations}
            activeThisMonth={stats.activeThisMonth}
          />
          <MyStudentHelpWidget />
          <MyStudentTipWidget />
          <MyStudentVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {/* Content */}
        {filteredStudents.length === 0 ? (
          students.length === 0 ? (
            <HubEmptyState
              title={emptyStateTitle}
              description={emptyStateMessage}
              actionLabel="Add Your First Student"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <HubEmptyState
              title="No students found"
              description={
                activeTab === 'recently-added'
                  ? 'No students have been added in the last 7 days.'
                  : activeTab === 'with-integrations'
                  ? 'No students have connected integrations yet.'
                  : searchQuery
                  ? `No students match "${searchQuery}"`
                  : 'No students found for the selected filter.'
              }
            />
          )
        ) : (
          <>
            <div className={styles.studentsList}>
              {paginatedStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  currentUserId={profile?.id || ''}
                  onRemove={handleRemove}
                  onViewProgress={handleViewProgress}
                />
              ))}
            </div>

            {/* Pagination */}
            {filteredStudents.length > ITEMS_PER_PAGE && (
              <HubPagination
                currentPage={currentPage}
                totalItems={filteredStudents.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      {/* Student Invite Modal */}
      <StudentInviteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleStudentInviteSuccess}
      />
    </HubPageLayout>
  );
}
