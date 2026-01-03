/**
 * Filename: /organisation/[id]/tasks/page.tsx
 * Purpose: Organisation task management dashboard
 * Created: 2026-01-03
 * Based on: referrals/page.tsx - Adapted for task management
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRouter } from 'next/navigation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import HubToolbar from '@/app/components/hub/toolbar/HubToolbar';
import { TaskPipeline } from './components/TaskPipeline';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import styles from './page.module.css';

interface OrganisationTasksPageProps {
  params: {
    id: string;
  };
}

type TabType = 'tasks';

export default function OrganisationTasksPage({
  params,
}: OrganisationTasksPageProps) {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string | string[]>>({
    priority: 'all',
    category: 'all',
    assignedTo: 'all',
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch organisation details
  const {
    data: organisation,
    isLoading: orgLoading,
    error: orgError,
  } = useQuery({
    queryKey: ['organisation', params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connection_groups')
        .select('id, name, slug, profile_id')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!params.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if user is owner or admin
  const {
    data: userRole,
    isLoading: roleLoading,
  } = useQuery({
    queryKey: ['user-role', params.id, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      // Check if owner
      if (organisation?.profile_id === profile.id) {
        return { isOwner: true, isAdmin: true };
      }

      // Check if admin
      const { data: isAdminData } = await supabase
        .rpc('is_organisation_admin', {
          org_id: params.id,
          user_profile_id: profile.id
        });

      return {
        isOwner: false,
        isAdmin: isAdminData || false,
      };
    },
    enabled: !!profile?.id && !!params.id && !!organisation,
  });

  const isLoading = profileLoading || orgLoading || roleLoading;
  const isOwner = userRole?.isOwner || false;
  const isAdmin = userRole?.isAdmin || false;
  const hasAccess = isOwner || isAdmin;

  const handleCardClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  };

  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedTaskId(null);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleTaskUpdate = () => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['org-tasks', params.id] });
  };

  const handleTaskCreate = () => {
    setIsCreateModalOpen(false);
    handleTaskUpdate();
    toast.success('Task created successfully');
  };

  const handleExportCSV = async () => {
    try {
      toast.loading('Generating CSV export...', { id: 'csv-export' });

      // Fetch all tasks
      const { data, error } = await supabase
        .from('org_tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          category,
          due_date,
          created_at,
          completed_at,
          client:client_id(full_name, email),
          assigned:assigned_to(full_name, email),
          creator:created_by(full_name, email)
        `)
        .eq('organisation_id', params.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No tasks to export', { id: 'csv-export' });
        return;
      }

      // Generate CSV content
      const headers = ['Title', 'Status', 'Priority', 'Category', 'Client', 'Assigned To', 'Due Date', 'Created', 'Completed'];
      const rows = data.map((task: any) => [
        task.title || '',
        task.status || '',
        task.priority || '',
        task.category || '',
        task.client?.full_name || '',
        task.assigned?.full_name || '',
        task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
        new Date(task.created_at).toLocaleDateString(),
        task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '',
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tasks-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('CSV exported successfully!', { id: 'csv-export' });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV', { id: 'csv-export' });
    }
  };

  // Define tabs
  const tabs: HubTab[] = useMemo(() => {
    return [
      { id: 'tasks', label: 'Tasks', active: activeTab === 'tasks' },
    ];
  }, [activeTab]);

  // Redirect if not authorized
  if (!isLoading && organisation && !hasAccess) {
    router.push('/organisation');
    return null;
  }

  // Redirect if no organisation found
  if (!isLoading && !organisation) {
    router.push('/organisation');
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Tasks"
          subtitle={
            isOwner
              ? 'Manage client issues and workflows'
              : 'View and manage assigned tasks'
          }
        />
      }
      tabs={
        <HubTabs
          tabs={tabs}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        />
      }
      sidebar={
        <HubSidebar>
          {/* Task stats widget would go here */}
          <div className={styles.sidebarPlaceholder}>
            <p>Task stats coming soon...</p>
          </div>
        </HubSidebar>
      }
      fullWidth={true}
    >
      <div className={styles.pipelineContainer}>
        {/* HubToolbar - positioned 8px above kanban board */}
        <HubToolbar
          searchPlaceholder="Search tasks..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              key: 'priority',
              label: 'Priority',
              options: [
                { label: 'All Priorities', value: 'all' },
                { label: 'Urgent', value: 'urgent' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ],
            },
            {
              key: 'category',
              label: 'Category',
              options: [
                { label: 'All Categories', value: 'all' },
                { label: 'Admin', value: 'admin' },
                { label: 'Client Issue', value: 'client_issue' },
                { label: 'Tutor Issue', value: 'tutor_issue' },
                { label: 'Booking Issue', value: 'booking_issue' },
                { label: 'Payment Issue', value: 'payment_issue' },
                { label: 'Safeguarding', value: 'safeguarding' },
                { label: 'Other', value: 'other' },
              ],
            },
          ]}
          filterValues={filterValues}
          onFilterChange={(key, value) => setFilterValues({ ...filterValues, [key]: value })}
          onExport={handleExportCSV}
          toolbarActions={
            (isOwner || isAdmin) && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className={styles.newTaskButton}
              >
                + New Task
              </button>
            )
          }
          variant="minimal"
        />

        {/* Kanban Board */}
        <TaskPipeline
          organisationId={params.id}
          priorityFilter={filterValues.priority as string}
          categoryFilter={filterValues.category as string}
          searchQuery={searchQuery}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Task Detail Modal */}
      {isDetailModalOpen && selectedTaskId && (
        <TaskDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleDetailModalClose}
          taskId={selectedTaskId}
          organisationId={params.id}
          onUpdate={handleTaskUpdate}
        />
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={handleCreateModalClose}
          organisationId={params.id}
          onCreate={handleTaskCreate}
        />
      )}
    </HubPageLayout>
  );
}
