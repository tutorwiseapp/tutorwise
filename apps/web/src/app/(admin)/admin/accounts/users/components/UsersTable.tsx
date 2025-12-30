/**
 * Filename: UsersTable.tsx
 * Purpose: Users-specific instance of HubDataTable
 * Created: 2025-12-28
 * Pattern: Instantiates generic HubDataTable with user-specific configuration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import { MoreVertical, CheckCircle2, XCircle, Filter as FilterIcon } from 'lucide-react';
import styles from './UsersTable.module.css';
import AdvancedFiltersDrawer, { AdvancedFilters } from './AdvancedFiltersDrawer';

// User type
interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  active_role: string | null;
  profile_completed: boolean | null;
  identity_verified: boolean | null;
  dbs_verified: boolean | null;
  proof_of_address_verified: boolean | null;
  is_admin: boolean;
  admin_role: string | null;
  created_at: string;
  updated_at: string | null;
}

// Badge components
function UserTypeBadge({ userType, isAdmin, adminRole }: { userType: string | null; isAdmin: boolean; adminRole: string | null }) {
  const getBadgeClass = () => {
    if (isAdmin) return styles.badgeAdmin;
    if (userType === 'tutor') return styles.badgeTutor;
    if (userType === 'client') return styles.badgeClient;
    return styles.badgeDefault;
  };

  const getLabel = () => {
    if (isAdmin) return adminRole || 'Admin';
    if (userType) return userType.charAt(0).toUpperCase() + userType.slice(1);
    return '—';
  };

  return (
    <span className={`${styles.badge} ${getBadgeClass()}`}>
      {getLabel()}
    </span>
  );
}

function OnboardingBadge({ completed }: { completed: boolean | null }) {
  return (
    <span className={`${styles.badge} ${completed ? styles.badgeCompleted : styles.badgePending}`}>
      {completed ? 'Completed' : 'Pending'}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className={styles.verifiedBadge}>
      <CheckCircle2 size={18} />
    </span>
  ) : (
    <span className={styles.unverifiedBadge}>
      <XCircle size={18} />
    </span>
  );
}

export default function UsersTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Actions menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Advanced filters state
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    userType: '',
    onboardingStatus: '',
    identityVerified: '',
    dbsVerified: '',
    poaVerified: '',
    createdDateFrom: '',
    createdDateTo: '',
  });

  // Calculate active filters
  const advancedFilterCount = Object.values(advancedFilters).filter((value) => value !== '').length;
  const advancedFiltersActive = advancedFilterCount > 0;

  // Fetch users data
  const { data: usersData, isLoading, refetch, error } = useQuery<{ users: User[]; total: number }>({
    queryKey: ['admin-all-users-table', page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/admin/accounts/users?page=${page}&limit=${limit}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      return response.json();
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  const users = usersData?.users || [];


  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.actionsMenu')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Action handlers
  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setOpenMenuId(null);
    // TODO: Open detail modal
  };

  const handleImpersonateUser = async (user: User) => {
    if (confirm(`Impersonate ${user.full_name || user.email}?\n\nThis will log you in as this user.`)) {
      // TODO: Implement impersonation
      alert('Impersonation functionality coming soon');
      setOpenMenuId(null);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (confirm(`Send password reset email to ${user.email}?`)) {
      // TODO: Implement password reset
      alert('Password reset functionality coming soon');
      setOpenMenuId(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (confirm(`Are you sure you want to DELETE this user? This action cannot be undone.\n\nUser: ${user.full_name || user.email}`)) {
      // TODO: Implement delete user
      alert('Delete user functionality coming soon');
      setOpenMenuId(null);
    }
  };

  // Define columns
  const columns: Column<User>[] = [
    {
      key: 'email',
      label: 'Email',
      width: '18%',
      sortable: true,
      render: (user) => (
        <span className={styles.emailCell}>{user.email}</span>
      ),
    },
    {
      key: 'full_name',
      label: 'Name',
      width: '12%',
      sortable: true,
      render: (user) => user.full_name || '—',
    },
    {
      key: 'active_role',
      label: 'Type',
      width: '10%',
      render: (user) => (
        <UserTypeBadge
          userType={user.active_role}
          isAdmin={user.is_admin}
          adminRole={user.admin_role}
        />
      ),
    },
    {
      key: 'profile_completed',
      label: 'Onboarding',
      width: '8%',
      hideOnMobile: true,
      render: (user) => <VerifiedBadge verified={user.profile_completed || false} />,
    },
    {
      key: 'profile_completed_duplicate',
      label: 'Profile',
      width: '7%',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (user) => <VerifiedBadge verified={user.profile_completed || false} />,
    },
    {
      key: 'identity_verified',
      label: 'Identity',
      width: '7%',
      hideOnMobile: true,
      render: (user) => <VerifiedBadge verified={user.identity_verified || false} />,
    },
    {
      key: 'dbs_verified',
      label: 'DBS',
      width: '7%',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (user) => <VerifiedBadge verified={user.dbs_verified || false} />,
    },
    {
      key: 'proof_of_address_verified',
      label: 'POA',
      width: '7%',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (user) => <VerifiedBadge verified={user.proof_of_address_verified || false} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '10%',
      sortable: true,
      hideOnTablet: true,
      render: (user) => (
        <span className={styles.dateCell}>{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: 'updated_at',
      label: 'Updated',
      width: '10%',
      hideOnTablet: true,
      render: (user) => (
        <span className={styles.dateCell}>{formatDate(user.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (user) => (
        <div className={styles.actionsCell}>
          <button
            className={styles.actionsButton}
            onClick={(e) => {
              e.stopPropagation();
              const button = e.currentTarget;
              const rect = button.getBoundingClientRect();

              if (openMenuId === user.id) {
                setOpenMenuId(null);
                setMenuPosition(null);
              } else {
                setOpenMenuId(user.id);
                // Position menu below the button, aligned to the right
                setMenuPosition({
                  top: rect.bottom + 4,
                  left: rect.right - 160, // 160px is menu width
                });
              }
            }}
            aria-label="More actions"
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === user.id && menuPosition && (
            <div
              className={`${styles.actionsMenu} actionsMenu`}
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              <button
                className={styles.actionMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(user);
                }}
              >
                View Details
              </button>
              {!user.is_admin && (
                <button
                  className={styles.actionMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImpersonateUser(user);
                  }}
                >
                  Impersonate User
                </button>
              )}
              <button
                className={styles.actionMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetPassword(user);
                }}
              >
                Reset Password
              </button>
              <button
                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteUser(user);
                }}
              >
                Delete User
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Define filters
  const filters: Filter[] = [
    {
      key: 'user_type',
      label: 'All Types',
      options: [
        { label: 'Tutors', value: 'tutor' },
        { label: 'Clients', value: 'client' },
        { label: 'Agents', value: 'agent' },
        { label: 'Admins', value: 'admin' },
      ],
    },
    {
      key: 'onboarding',
      label: 'All Onboarding',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Pending', value: 'pending' },
      ],
    },
    {
      key: 'verified',
      label: 'All Verification',
      options: [
        { label: 'Verified', value: 'verified' },
        { label: 'Unverified', value: 'unverified' },
      ],
    },
  ];

  // Pagination config
  const paginationConfig: PaginationConfig = {
    page,
    limit,
    total: usersData?.total || 0,
    onPageChange: setPage,
    onLimitChange: (newLimit) => {
      setLimit(newLimit);
      setPage(1); // Reset to first page when changing page size
    },
    pageSizeOptions: [10, 20, 50, 100],
  };

  // Handle export to CSV
  const handleExport = () => {
    if (!users || users.length === 0) return;

    // Create CSV header
    const headers = [
      'Email',
      'Name',
      'Type',
      'Onboarding',
      'Profile',
      'Identity',
      'DBS',
      'POA',
      'Created',
      'Updated',
      'ID',
    ];

    // Create CSV rows
    const rows = users.map((user) => {
      return [
        user.email,
        user.full_name || 'N/A',
        user.is_admin ? (user.admin_role || 'Admin') : (user.active_role || 'N/A'),
        user.profile_completed ? 'Completed' : 'Pending',
        user.profile_completed ? 'Yes' : 'No',
        user.identity_verified ? 'Yes' : 'No',
        user.dbs_verified ? 'Yes' : 'No',
        user.proof_of_address_verified ? 'Yes' : 'No',
        new Date(user.created_at).toLocaleDateString('en-GB'),
        user.updated_at ? new Date(user.updated_at).toLocaleDateString('en-GB') : 'N/A',
        user.id,
      ];
    });

    // Combine headers and rows
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Advanced Filters Drawer */}
      <AdvancedFiltersDrawer
        isOpen={isAdvancedFiltersOpen}
        onClose={() => setIsAdvancedFiltersOpen(false)}
        filters={advancedFilters}
        onFiltersChange={(newFilters) => {
          setAdvancedFilters(newFilters);
          setPage(1); // Reset to first page when filters change
        }}
      />

      <HubDataTable
        columns={columns}
        data={users}
        loading={isLoading}
        onRowClick={(user) => setSelectedUser(user)}
        onRefresh={() => refetch()}
        onExport={handleExport}
        filters={filters}
        pagination={paginationConfig}
        emptyMessage={error ? `Error loading users: ${error.message}` : "No users found. Try adjusting your filters or check if users exist in the database."}
        searchPlaceholder="Search by name or email..."
        autoRefreshInterval={30000}
        enableSavedViews={true}
        savedViewsKey="admin_users_savedViews"
        toolbarActions={
          <button
            className={`${styles.filtersButton} ${advancedFiltersActive ? styles.active : ''}`}
            onClick={() => setIsAdvancedFiltersOpen(true)}
            title={advancedFiltersActive ? `${advancedFilterCount} filter(s) active` : 'Advanced Filters'}
          >
            <FilterIcon size={16} />
            {advancedFiltersActive && (
              <span className={styles.filtersBadge}>
                {advancedFilterCount}
              </span>
            )}
          </button>
        }
      />
    </>
  );
}
