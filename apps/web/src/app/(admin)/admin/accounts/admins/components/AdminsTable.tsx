/**
 * Filename: AdminsTable.tsx
 * Purpose: Admins-specific instance of HubDataTable
 * Created: 2025-12-28
 * Pattern: Instantiates generic HubDataTable with admin-specific configuration
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import styles from './AdminsTable.module.css';
import type { AdminRole } from '@/lib/rbac/types';

// Admin user type
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

interface AdminsTableProps {
  currentUserId?: string;
  onChangeRole: (user: AdminUser) => void;
  onRevokeAdmin: (user: AdminUser) => void;
}

// Role badge component
function RoleBadge({ role }: { role: AdminRole }) {
  const getBadgeClass = () => {
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
        return styles.badgeDefault;
    }
  };

  return (
    <span className={`${styles.badge} ${getBadgeClass()}`}>
      {role}
    </span>
  );
}

export default function AdminsTable({ currentUserId, onChangeRole, onRevokeAdmin }: AdminsTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // Fetch admins data
  const { data: adminsData, isLoading, refetch, error } = useQuery<{ admins: AdminUser[]; total: number }>({
    queryKey: ['admin-admins-table', page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch admins');
      }
      const data = await response.json();
      // The API returns { adminUsers }, we need to transform it
      return {
        admins: data.adminUsers || [],
        total: data.adminUsers?.length || 0,
      };
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  const admins = adminsData?.admins || [];

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Define columns
  const columns: Column<AdminUser>[] = [
    {
      key: 'email',
      label: 'Email',
      width: '25%',
      sortable: true,
      render: (admin) => (
        <span className={styles.emailCell}>{admin.email}</span>
      ),
    },
    {
      key: 'full_name',
      label: 'Name',
      width: '20%',
      sortable: true,
      render: (admin) => admin.full_name || '—',
    },
    {
      key: 'admin_role',
      label: 'Role',
      width: '15%',
      render: (admin) => <RoleBadge role={admin.admin_role} />,
    },
    {
      key: 'admin_granted_at',
      label: 'Granted',
      width: '15%',
      sortable: true,
      hideOnMobile: true,
      render: (admin) => (
        <span className={styles.dateCell}>{formatDate(admin.admin_granted_at)}</span>
      ),
    },
    {
      key: 'last_admin_access',
      label: 'Last Access',
      width: '15%',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (admin) => (
        <span className={styles.dateCell}>{formatDate(admin.last_admin_access)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (admin) => {
        const isCurrentUser = admin.id === currentUserId;

        if (isCurrentUser) {
          return <span className={styles.youLabel}>You</span>;
        }

        return (
          <VerticalDotsMenu
            actions={[
              { label: 'Change Role', onClick: () => onChangeRole(admin) },
              { label: 'Revoke Admin Access', onClick: () => onRevokeAdmin(admin), variant: 'danger' as const },
            ]}
          />
        );
      },
    },
  ];

  // Define filters
  const filters: Filter[] = [
    {
      key: 'admin_role',
      label: 'All Roles',
      options: [
        { label: 'Superadmin', value: 'superadmin' },
        { label: 'Admin', value: 'admin' },
        { label: 'System Admin', value: 'systemadmin' },
        { label: 'Support Admin', value: 'supportadmin' },
      ],
    },
  ];

  // Pagination config
  const paginationConfig: PaginationConfig = {
    page,
    limit,
    total: adminsData?.total || 0,
    onPageChange: setPage,
    onLimitChange: (newLimit) => {
      setLimit(newLimit);
      setPage(1);
    },
    pageSizeOptions: [10, 20, 50, 100],
  };

  // Handle export to CSV
  const handleExport = () => {
    if (!admins || admins.length === 0) return;

    const headers = [
      'Email',
      'Name',
      'Role',
      'Role Level',
      'Granted',
      'Last Access',
      'ID',
    ];

    const rows = admins.map((admin) => {
      return [
        admin.email,
        admin.full_name || 'N/A',
        admin.admin_role,
        admin.admin_role_level.toString(),
        formatDate(admin.admin_granted_at),
        formatDate(admin.last_admin_access),
        admin.id,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admins-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <HubDataTable
        columns={columns}
        data={admins}
        loading={isLoading}
        onRowClick={(admin) => setSelectedAdmin(admin)}
        onRefresh={() => refetch()}
        onExport={handleExport}
        filters={filters}
        pagination={paginationConfig}
        emptyMessage={error ? `Error loading admins: ${error.message}` : "No admin users found."}
        searchPlaceholder="Search by name or email..."
        autoRefreshInterval={30000}
        enableSavedViews={true}
        savedViewsKey="admin_admins_savedViews"
      />
    </>
  );
}
