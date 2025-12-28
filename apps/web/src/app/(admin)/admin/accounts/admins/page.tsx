/*
 * Filename: src/app/(admin)/admin/accounts/admins/page.tsx
 * Purpose: Admin Users page - Overview and management
 * Created: 2025-12-28
 * Phase: 2 - Platform Management
 */
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { useAdminProfile } from '@/lib/rbac';
import AdminsTable from './components/AdminsTable';
import GrantAdminModal from '@/app/components/admin/modals/GrantAdminModal';
import RevokeAdminModal from '@/app/components/admin/modals/RevokeAdminModal';
import ChangeRoleModal from '@/app/components/admin/modals/ChangeRoleModal';
import styles from './page.module.css';
import type { AdminRole } from '@/lib/rbac/types';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

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
  const { profile: currentAdminProfile } = useAdminProfile();
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Fetch admin users data
  const { data: adminsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, admin_role, admin_role_level, admin_granted_at, last_admin_access, created_at')
        .eq('is_admin', true)
        .order('admin_role_level', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  const adminUsers: AdminUser[] = adminsData || [];

  // Calculate stats
  const totalAdmins = adminUsers.length;
  const superadmins = adminUsers.filter((u) => u.admin_role === 'superadmin').length;
  const admins = adminUsers.filter((u) => u.admin_role === 'admin').length;
  const systemAdmins = adminUsers.filter((u) => u.admin_role === 'systemadmin').length;
  const supportAdmins = adminUsers.filter((u) => u.admin_role === 'supportadmin').length;

  // Header actions
  const getHeaderActions = () => {
    return (
      <Button variant="primary" size="sm" onClick={() => setShowGrantModal(true)}>
        Grant Admin Access
      </Button>
    );
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Admins"
          subtitle="Manage admin access and permissions"
          actions={getHeaderActions()}
          className={styles.adminsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all-admins', label: 'All Admins', count: totalAdmins, active: true }
          ]}
          onTabChange={() => {}}
          className={styles.adminsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Admin Overview"
            stats={[
              { label: 'Total Admins', value: totalAdmins },
              { label: 'Superadmins', value: superadmins },
              { label: 'Admins', value: admins },
              { label: 'System Admins', value: systemAdmins },
              { label: 'Support Admins', value: supportAdmins },
            ]}
          />
          <AdminHelpWidget
            title="Admin User Management"
            items={[
              { question: 'What is this page?', answer: 'Manage admin access for platform users. Grant or revoke admin roles based on team responsibilities. Only higher-level admins can manage lower-level admins.' },
              { question: 'What roles are available?', answer: 'Superadmin, Admin, System Admin, and Support Admin with different permission levels.' },
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
        </HubSidebar>
      }
    >
      <AdminsTable
        currentUserId={currentAdminProfile?.id}
        onChangeRole={(user) => {
          setSelectedUser(user);
          setShowChangeRoleModal(true);
        }}
        onRevokeAdmin={(user) => {
          setSelectedUser(user);
          setShowRevokeModal(true);
        }}
      />

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
