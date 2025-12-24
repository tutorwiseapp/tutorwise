/*
 * Filename: src/app/(admin)/admin/users/all/page.tsx
 * Purpose: All Users list page with filtering and search
 * Created: 2025-12-24
 * Phase: 2 - Platform Management
 */
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { HubTable } from '@/app/components/hub/table';
import Button from '@/app/components/ui/actions/Button';
import { ArrowLeft, Download, Filter } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  active_role: string | null;
  onboarding_completed: any;
  is_admin: boolean;
  admin_role: string | null;
  created_at: string;
}

type FilterType = 'all' | 'active' | 'pending' | 'admins';

export default function AdminUsersAllPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canViewUsers = usePermission('users', 'view');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users'>('users');
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';
  const [filterType, setFilterType] = useState<FilterType>(initialFilter);

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, first_name, last_name, active_role, onboarding_completed, is_admin, admin_role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: canViewUsers,
  });

  // Filter and search users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply filter type
    switch (filterType) {
      case 'active':
        filtered = users.filter(u => u.onboarding_completed && JSON.stringify(u.onboarding_completed) !== '{}');
        break;
      case 'pending':
        filtered = users.filter(u => !u.onboarding_completed || JSON.stringify(u.onboarding_completed) === '{}');
        break;
      case 'admins':
        filtered = users.filter(u => u.is_admin);
        break;
      default:
        filtered = users;
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(query) ||
        u.display_name?.toLowerCase().includes(query) ||
        u.first_name?.toLowerCase().includes(query) ||
        u.last_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, filterType, searchQuery]);

  // Table columns
  const columns = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (user: UserProfile) => (
        <div className={styles.userCell}>
          <span className={styles.userEmail}>{user.email}</span>
          {user.display_name && (
            <span className={styles.userName}>{user.display_name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (user: UserProfile) => (
        <span className={styles.userName}>
          {user.first_name || user.last_name
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
            : '—'}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user: UserProfile) => (
        <span className={styles.roleText}>
          {user.active_role || 'Not set'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user: UserProfile) => {
        const isActive = user.onboarding_completed && JSON.stringify(user.onboarding_completed) !== '{}';
        const isAdmin = user.is_admin;

        return (
          <div className={styles.statusCell}>
            {isAdmin && (
              <span className={styles.adminBadge}>
                Admin
              </span>
            )}
            <span className={isActive ? styles.activeBadge : styles.pendingBadge}>
              {isActive ? 'Active' : 'Pending'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Joined',
      sortable: true,
      render: (user: UserProfile) => (
        <span className={styles.dateText}>
          {new Date(user.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
  ];

  // Header actions
  const getHeaderActions = () => (
    <div className={styles.headerActions}>
      <Link href="/admin/users">
        <Button variant="secondary" size="sm">
          <ArrowLeft className={styles.buttonIcon} />
          Back to Overview
        </Button>
      </Link>
      <Button variant="secondary" size="sm">
        <Download className={styles.buttonIcon} />
        Export CSV
      </Button>
    </div>
  );

  // Filter tabs
  const filterTabs = [
    { id: 'all', label: `All (${users.length})`, active: filterType === 'all' },
    { id: 'active', label: `Active (${users.filter(u => u.onboarding_completed && JSON.stringify(u.onboarding_completed) !== '{}').length})`, active: filterType === 'active' },
    { id: 'pending', label: `Pending (${users.filter(u => !u.onboarding_completed || JSON.stringify(u.onboarding_completed) === '{}').length})`, active: filterType === 'pending' },
    { id: 'admins', label: `Admins (${users.filter(u => u.is_admin).length})`, active: filterType === 'admins' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="All Users"
          subtitle={`Viewing ${filteredUsers.length} of ${users.length} users`}
          actions={getHeaderActions()}
          className={styles.allUsersHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={filterTabs}
          onTabChange={(tabId) => setFilterType(tabId as FilterType)}
          className={styles.allUsersTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="User Breakdown"
            stats={[
              { label: 'Total Users', value: users.length },
              { label: 'Active', value: users.filter(u => u.onboarding_completed && JSON.stringify(u.onboarding_completed) !== '{}').length },
              { label: 'Pending', value: users.filter(u => !u.onboarding_completed || JSON.stringify(u.onboarding_completed) === '{}').length },
              { label: 'Admins', value: users.filter(u => u.is_admin).length },
            ]}
          />
          <AdminHelpWidget
            title="User List Help"
            items={[
              { question: 'What is an active user?', answer: 'Users who have completed onboarding and set up their profile.' },
              { question: 'What is a pending user?', answer: 'Users who registered but have not completed onboarding yet.' },
              { question: 'How do I search users?', answer: 'Use the search box to filter by email, name, or display name.' },
            ]}
          />
          <AdminTipWidget
            title="Management Tips"
            tips={[
              'Export user data for analysis',
              'Monitor pending onboarding completion rate',
              'Track user growth over time',
              'Contact pending users to complete setup',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Search and Filters */}
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search users by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Users Table */}
      <HubTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        emptyMessage="No users found"
      />
    </HubPageLayout>
  );
}
