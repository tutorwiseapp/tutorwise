/*
 * Filename: src/app/(admin)/admin/users/page.tsx
 * Purpose: Admin Users overview page
 * Created: 2025-12-23
 * Phase: 2 - Platform Management
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { Users, UserCog, Shield, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminUsersOverviewPage() {
  const router = useRouter();
  const canManageUsers = usePermission('users', 'view');
  const canManageAdmins = usePermission('admin_users', 'view');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  // Fetch user metrics with trend data from statistics table
  const totalUsersMetric = useAdminMetric({ metric: 'total_users', compareWith: 'last_month' });
  const activeUsersMetric = useAdminMetric({ metric: 'active_users', compareWith: 'last_month' });
  const adminUsersMetric = useAdminMetric({ metric: 'admin_users', compareWith: 'last_month' });
  const pendingOnboardingMetric = useAdminMetric({ metric: 'pending_onboarding_users', compareWith: 'last_month' });

  // Header actions with primary CTA and secondary dropdown
  const getHeaderActions = () => {
    if (!canManageAdmins) return undefined;

    return (
      <div className={styles.headerActions}>
        {/* Primary Action: Manage Admins */}
        <Link href="/admin/users/admins">
          <Button variant="primary" size="sm">
            <Shield className={styles.buttonIcon} />
            Manage Admins
          </Button>
        </Link>

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
                  onClick={() => {
                    router.push('/admin/users/all');
                    setShowActionsMenu(false);
                  }}
                  className={actionStyles.menuButton}
                >
                  View All Users
                </button>
                <button
                  onClick={() => {
                    router.push('/admin/users/roles');
                    setShowActionsMenu(false);
                  }}
                  className={actionStyles.menuButton}
                >
                  Manage Roles
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="User Management"
          subtitle="Manage platform users, admins, and permissions"
          actions={getHeaderActions()}
          className={styles.usersHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview')}
          className={styles.usersTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="User Overview"
            stats={[
              { label: 'Total Users', value: totalUsersMetric.value },
              { label: 'Active Users', value: activeUsersMetric.value },
              { label: 'Admin Users', value: adminUsersMetric.value },
              { label: 'Pending Onboarding', value: pendingOnboardingMetric.value },
            ]}
          />
          <AdminHelpWidget
            title="User Management Help"
            items={[
              { question: 'What is User Management?', answer: 'Control user accounts, permissions, and administrative access across the platform.' },
              { question: 'How do I manage admins?', answer: 'Click "Manage Admins" to grant, revoke, or change admin roles and permissions.' },
              { question: 'What roles are available?', answer: 'Superadmin, Admin, System Admin, and Support Admin with different permission levels.' },
            ]}
          />
          <AdminTipWidget
            title="User Tips"
            tips={[
              'Review admin permissions regularly',
              'Monitor user onboarding completion',
              'Track active vs inactive users',
              'Audit admin activity logs',
            ]}
          />
        </HubSidebar>
      }
    >

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards - Hub Pattern */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Users"
              value={totalUsersMetric.value}
              sublabel={formatMetricChange(totalUsersMetric.change, totalUsersMetric.changePercent, 'last_month')}
              icon={Users}
              variant="info"
              clickable
              href="/admin/users/all"
            />
            <HubKPICard
              label="Active Users"
              value={activeUsersMetric.value}
              sublabel={formatMetricChange(activeUsersMetric.change, activeUsersMetric.changePercent, 'last_month')}
              icon={UserCog}
              variant="success"
              clickable
              href="/admin/users/all?filter=active"
            />
            <HubKPICard
              label="Admin Users"
              value={adminUsersMetric.value}
              sublabel={formatMetricChange(adminUsersMetric.change, adminUsersMetric.changePercent, 'last_month')}
              icon={Shield}
              variant="warning"
              clickable
              href="/admin/users/admins"
            />
            <HubKPICard
              label="Pending Onboarding"
              value={pendingOnboardingMetric.value}
              sublabel={formatMetricChange(pendingOnboardingMetric.change, pendingOnboardingMetric.changePercent, 'last_month') || 'Awaiting completion'}
              icon={Users}
              variant="neutral"
            />
          </HubKPIGrid>

          {/* Actionable Widgets Section - Following Dashboard Pattern */}
          <div className={styles.actionableWidgets}>
            {/* Recent Activity Widget */}
            <div className={styles.recentActivityWidget}>
              <h3 className={styles.widgetTitle}>Recent Activity</h3>
              <p className={styles.emptyMessage}>No recent user activity to display.</p>
            </div>

            {/* User Growth Widget (Placeholder) */}
            <div className={styles.growthWidget}>
              <h3 className={styles.widgetTitle}>User Growth</h3>
              <p className={styles.emptyMessage}>Growth metrics coming soon.</p>
            </div>

            {/* User Insights Widget (Placeholder) */}
            <div className={styles.insightsWidget}>
              <h3 className={styles.widgetTitle}>User Insights</h3>
              <p className={styles.emptyMessage}>Insights and analytics coming soon.</p>
            </div>
          </div>
        </>
      )}
    </HubPageLayout>
  );
}
