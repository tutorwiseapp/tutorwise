/*
 * Filename: src/app/(admin)/admin/accounts/admins/page.tsx
 * Purpose: Admin management page (grant/revoke admin access, change roles)
 * Created: 2025-12-28
 * Specification: Admin Dashboard RBAC - Admin Users Management
 *
 * Pattern: Follows Listings/Financials pattern with HubPageLayout + HubTabs + 4-card sidebar
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget, AdminVideoWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { useAdminProfile, useIsSuperadmin } from '@/lib/rbac';
import type { AdminRole } from '@/lib/rbac/types';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import GrantAdminModal from '@/app/components/admin/modals/GrantAdminModal';
import RevokeAdminModal from '@/app/components/admin/modals/RevokeAdminModal';
import ChangeRoleModal from '@/app/components/admin/modals/ChangeRoleModal';
import styles from './page.module.css';
import toast from 'react-hot-toast';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type RoleFilter = 'all' | 'superadmin' | 'admin' | 'systemadmin' | 'supportadmin';
type SortType = 'newest' | 'oldest' | 'role-high' | 'role-low' | 'email-asc';

const ITEMS_PER_PAGE = 10;

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  admin_role: AdminRole;
  admin_role_level: number;
  admin_granted_by?: string;
  admin_granted_at?: string;
  last_admin_access?: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roleFilter = (searchParams?.get('role') as RoleFilter) || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('role-high');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const { profile: currentAdminProfile } = useAdminProfile();
  const { isSuperadmin } = useIsSuperadmin();

  // Fetch admin users
  const { data: adminUsersData, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch admin users');
      return res.json();
    },
  });

  const adminUsers: AdminUser[] = adminUsersData?.adminUsers || [];

  // Filter by role tab
  const filteredByRole = useMemo(() => {
    if (roleFilter === 'all') return adminUsers;
    return adminUsers.filter((user) => user.admin_role === roleFilter);
  }, [adminUsers, roleFilter]);

  // Search filter
  const searchedUsers = useMemo(() => {
    if (!searchQuery.trim()) return filteredByRole;
    const query = searchQuery.toLowerCase();
    return filteredByRole.filter(
      (user) =>
        user.email?.toLowerCase().includes(query) ||
        user.full_name?.toLowerCase().includes(query)
    );
  }, [filteredByRole, searchQuery]);

  // Sort
  const sortedUsers = useMemo(() => {
    const sorted = [...searchedUsers];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'role-high':
        return sorted.sort((a, b) => (b.admin_role_level || 0) - (a.admin_role_level || 0));
      case 'role-low':
        return sorted.sort((a, b) => (a.admin_role_level || 0) - (b.admin_role_level || 0));
      case 'email-asc':
        return sorted.sort((a, b) => a.email.localeCompare(b.email));
      default:
        return sorted;
    }
  }, [searchedUsers, sortBy]);

  // Pagination
  const totalItems = sortedUsers.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchQuery, sortBy]);

  // Tab change handler
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'all') {
      params.delete('role');
    } else {
      params.set('role', tabId);
    }
    router.push(`/admin/accounts/admins${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Stats for tabs
  const stats = useMemo(() => ({
    all: adminUsers.length,
    superadmin: adminUsers.filter((u) => u.admin_role === 'superadmin').length,
    admin: adminUsers.filter((u) => u.admin_role === 'admin').length,
    systemadmin: adminUsers.filter((u) => u.admin_role === 'systemadmin').length,
    supportadmin: adminUsers.filter((u) => u.admin_role === 'supportadmin').length,
  }), [adminUsers]);

  // Action handlers
  const handleGrantAdmin = () => {
    setShowGrantModal(true);
    setShowActionsMenu(false);
  };

  const handleRevokeAdmin = (user: AdminUser) => {
    setSelectedUser(user);
    setShowRevokeModal(true);
  };

  const handleChangeRole = (user: AdminUser) => {
    setSelectedUser(user);
    setShowChangeRoleModal(true);
  };

  const getRoleBadgeColor = (role: AdminRole) => {
    switch (role) {
      case 'superadmin':
        return styles.badgeSuperadmin;
      case 'admin':
        return styles.badgeAdmin;
      case 'systemadmin':
        return styles.badgeSystemadmin;
      case 'supportadmin':
        return styles.badgeSupportadmin;
      default:
        return '';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Admin Users"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className={filterStyles.filterSelect}
              >
                <option value="role-high">Role (High to Low)</option>
                <option value="role-low">Role (Low to High)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="email-asc">Email (A-Z)</option>
              </select>
            </div>
          }
          actions={
            <>
              <Button variant="primary" size="sm" onClick={handleGrantAdmin}>
                Grant Admin Access
              </Button>
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
                    <div className={actionStyles.backdrop} onClick={() => setShowActionsMenu(false)} />
                    <div className={actionStyles.dropdownMenu}>
                      <button className={actionStyles.menuButton} onClick={() => { refetch(); setShowActionsMenu(false); }}>
                        Refresh List
                      </button>
                      <button className={actionStyles.menuButton} onClick={() => { router.push('/admin/audit-logs'); setShowActionsMenu(false); }}>
                        View Audit Logs
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
            { id: 'all', label: 'All Admins', count: stats.all, active: roleFilter === 'all' },
            { id: 'superadmin', label: 'Super Admins', count: stats.superadmin, active: roleFilter === 'superadmin' },
            { id: 'admin', label: 'Admins', count: stats.admin, active: roleFilter === 'admin' },
            { id: 'systemadmin', label: 'System Admins', count: stats.systemadmin, active: roleFilter === 'systemadmin' },
            { id: 'supportadmin', label: 'Support Admins', count: stats.supportadmin, active: roleFilter === 'supportadmin' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Admin Statistics"
            stats={[
              { label: 'Total Admins', value: stats.all },
              { label: 'Superadmins', value: stats.superadmin, valueColor: 'black-bold' },
              { label: 'Admins', value: stats.admin },
              { label: 'System Admins', value: stats.systemadmin },
              { label: 'Support Admins', value: stats.supportadmin },
            ]}
          />
          <AdminHelpWidget
            title="Admin User Management"
            items={[
              { question: 'What is this page?', answer: 'Manage admin access for platform users. Grant or revoke admin roles based on team responsibilities. Only higher-level admins can manage lower-level admins.' },
            ]}
          />
          <AdminTipWidget
            title="Best Practices"
            tips={[
              'Only grant admin access to trusted team members',
              'Use the lowest role level needed for each task',
              'Regularly review admin access and revoke when no longer needed',
              'Monitor audit logs for suspicious activity',
            ]}
          />
          <AdminVideoWidget
            title="Tutorial"
            videoTitle="Managing Admin Users"
            videoDuration="4:30"
          />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {paginatedUsers.length === 0 ? (
          adminUsers.length === 0 ? (
            <HubEmptyState
              title="No admin users yet"
              description="Grant admin access to team members to get started."
              actionLabel="Grant Admin Access"
              onAction={handleGrantAdmin}
            />
          ) : (
            <HubEmptyState
              title="No admins found"
              description="No admin users match your current filters. Try adjusting your search or filters."
            />
          )
        ) : (
          <>
            {/* Admin Users Table */}
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Granted</th>
                    <th>Last Access</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id}>
                      <td className={styles.emailCell}>{user.email}</td>
                      <td>{user.full_name || '—'}</td>
                      <td>
                        <span className={`${styles.roleBadge} ${getRoleBadgeColor(user.admin_role)}`}>
                          {user.admin_role}
                        </span>
                      </td>
                      <td className={styles.dateCell}>{formatDate(user.admin_granted_at)}</td>
                      <td className={styles.dateCell}>{formatDate(user.last_admin_access)}</td>
                      <td className={styles.actionsCell}>
                        {user.id !== currentAdminProfile?.id && (
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleChangeRole(user)}
                              title="Change Role"
                            >
                              Edit
                            </button>
                            <button
                              className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                              onClick={() => handleRevokeAdmin(user)}
                              title="Revoke Admin Access"
                            >
                              Revoke
                            </button>
                          </div>
                        )}
                        {user.id === currentAdminProfile?.id && (
                          <span className={styles.youLabel}>You</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sortedUsers.length > ITEMS_PER_PAGE && (
              <HubPagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <GrantAdminModal
        isOpen={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        onSuccess={() => refetch()}
      />

      <RevokeAdminModal
        isOpen={showRevokeModal}
        onClose={() => {
          setShowRevokeModal(false);
          setSelectedUser(null);
        }}
        onSuccess={() => refetch()}
        user={selectedUser}
      />

      <ChangeRoleModal
        isOpen={showChangeRoleModal}
        onClose={() => {
          setShowChangeRoleModal(false);
          setSelectedUser(null);
        }}
        onSuccess={() => refetch()}
        user={selectedUser}
      />
    </HubPageLayout>
  );
}
