/*
 * Filename: src/app/(admin)/admin/users/roles/page.tsx
 * Purpose: User Roles management page
 * Created: 2025-12-24
 * Phase: 2 - Platform Management
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { ArrowLeft, UserCog } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminUsersRolesPage() {
  const router = useRouter();
  const canManageRoles = usePermission('users', 'update');
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  // Role definitions
  const roles = [
    {
      id: 'tutor',
      name: 'Tutor',
      description: 'Provides tutoring services, creates listings, and manages bookings',
      permissions: ['Create listings', 'Manage bookings', 'Receive payments', 'View student profiles'],
      userCount: '—', // To be populated from database
      color: '#3b82f6',
    },
    {
      id: 'client',
      name: 'Client',
      description: 'Books tutoring sessions, makes payments, and manages students',
      permissions: ['Book sessions', 'Make payments', 'Add students', 'View tutor profiles'],
      userCount: '—',
      color: '#8b5cf6',
    },
    {
      id: 'student',
      name: 'Student',
      description: 'Attends tutoring sessions booked by a client',
      permissions: ['View sessions', 'Access learning materials', 'Submit assignments'],
      userCount: '—',
      color: '#10b981',
    },
    {
      id: 'agent',
      name: 'Agent',
      description: 'Manages multiple tutors and handles bookings on their behalf',
      permissions: ['Manage tutors', 'Handle bookings', 'View analytics', 'Manage payments'],
      userCount: '—',
      color: '#f59e0b',
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
    </div>
  );

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="User Roles"
          subtitle="Manage platform user roles and permissions"
          actions={getHeaderActions()}
          className={styles.rolesHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview')}
          className={styles.rolesTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Role Distribution"
            stats={[
              { label: 'Total Roles', value: roles.length },
              { label: 'Active Users', value: '—' },
              { label: 'Multi-Role Users', value: '—' },
              { label: 'No Role Set', value: '—' },
            ]}
          />
          <AdminHelpWidget
            title="Role Management Help"
            items={[
              { question: 'What are user roles?', answer: 'Roles define what actions users can perform on the platform (tutor, client, student, agent).' },
              { question: 'Can users have multiple roles?', answer: 'Yes, users can switch between roles. For example, a tutor can also be a client.' },
              { question: 'How do I change a user\'s role?', answer: 'Go to All Users, select a user, and update their active role.' },
            ]}
          />
          <AdminTipWidget
            title="Role Tips"
            tips={[
              'Most users will be either tutors or clients',
              'Agents manage multiple tutors',
              'Students are typically added by clients',
              'Users can switch roles in their profile',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className={styles.rolesGrid}>
          {roles.map((role) => (
            <div key={role.id} className={styles.roleCard}>
              {/* Role Header */}
              <div className={styles.roleHeader}>
                <div className={styles.roleIconWrapper} style={{ backgroundColor: `${role.color}15` }}>
                  <UserCog className={styles.roleIcon} style={{ color: role.color }} />
                </div>
                <div className={styles.roleTitleSection}>
                  <h3 className={styles.roleTitle}>{role.name}</h3>
                  <span className={styles.roleCount}>{role.userCount} users</span>
                </div>
              </div>

              {/* Role Description */}
              <p className={styles.roleDescription}>{role.description}</p>

              {/* Role Permissions */}
              <div className={styles.permissionsSection}>
                <h4 className={styles.permissionsTitle}>Permissions:</h4>
                <ul className={styles.permissionsList}>
                  {role.permissions.map((permission, index) => (
                    <li key={index} className={styles.permissionItem}>
                      <span className={styles.permissionBullet}>•</span>
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Role Actions */}
              <div className={styles.roleActions}>
                <Button variant="secondary" size="sm" disabled={!canManageRoles}>
                  View Users
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </HubPageLayout>
  );
}
