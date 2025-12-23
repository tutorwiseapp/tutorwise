/*
 * Filename: src/app/(admin)/admin/page.tsx
 * Purpose: Admin Dashboard Overview page
 * Created: 2025-12-23
 * Specification: Admin Dashboard Solution Design v2, Section 5.2
 *
 * Pattern: Follows Listings/Financials pattern with HubPageLayout + HubTabs + 4-card sidebar
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget, AdminVideoWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type TabFilter = 'overview' | 'activity' | 'alerts';

export default function AdminOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'overview';
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Tab change handler
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/admin${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Mock stats (will be replaced with real data later)
  const stats = useMemo(() => ({
    totalUsers: 1250,
    activeListings: 342,
    recentBookings: 89,
    pendingModeration: 12,
    platformRevenue: 45680,
  }), []);

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Admin Dashboard"
          subtitle="Platform Overview & Management"
          className={styles.adminHeader}
          actions={
            <>
              <Button variant="primary" size="sm" onClick={() => router.push('/admin/settings')}>
                Settings
              </Button>
              <div className={actionStyles.dropdownContainer}>
                <Button variant="secondary" size="sm" square onClick={() => setShowActionsMenu(!showActionsMenu)}>
                  ⋮
                </Button>
                {showActionsMenu && (
                  <>
                    <div className={actionStyles.backdrop} onClick={() => setShowActionsMenu(false)} />
                    <div className={actionStyles.dropdownMenu}>
                      <button className={actionStyles.menuButton} onClick={() => router.push('/admin/reports')}>
                        View Reports
                      </button>
                      <button className={actionStyles.menuButton} onClick={() => router.push('/admin/users')}>
                        Manage Users
                      </button>
                      <button className={actionStyles.menuButton} onClick={() => router.push('/admin/seo/hubs')}>
                        SEO Management
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
            { id: 'overview', label: 'Overview', active: tabFilter === 'overview' },
            { id: 'activity', label: 'Activity', active: tabFilter === 'activity' },
            { id: 'alerts', label: 'Alerts', active: tabFilter === 'alerts' },
          ]}
          onTabChange={handleTabChange}
          className={styles.adminTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Platform Statistics"
            stats={[
              { label: 'Total Users', value: stats.totalUsers },
              { label: 'Active Listings', value: stats.activeListings },
              { label: 'Recent Bookings', value: stats.recentBookings, valueColor: 'green' },
              { label: 'Pending Moderation', value: stats.pendingModeration, valueColor: stats.pendingModeration > 0 ? 'orange' : 'default' },
              { label: 'Platform Revenue', value: `£${(stats.platformRevenue / 100).toFixed(2)}`, valueColor: 'black-bold' },
            ]}
          />
          <AdminHelpWidget
            title="Admin Dashboard"
            items={[
              { question: 'What is this dashboard?', answer: 'Welcome to the Tutorwise admin dashboard. Manage users, listings, SEO content, and platform settings from this centralized interface.' },
            ]}
          />
          <AdminTipWidget
            title="Getting Started"
            tips={[
              'Use the sidebar to navigate between admin sections',
              'Check pending moderation items daily',
              'Review SEO performance metrics weekly',
              'Monitor platform statistics for growth trends',
            ]}
          />
          <AdminVideoWidget
            title="Admin Tutorial"
            videoTitle="Getting Started with Admin Dashboard"
            videoDuration="5:00"
          />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {tabFilter === 'overview' && (
          <div className={styles.overviewContent}>
            <h2 className={styles.sectionTitle}>Welcome to Admin Dashboard</h2>
            <p className={styles.description}>
              This is Phase 0 - Foundation of the admin dashboard implementation.
              The core architecture is now in place:
            </p>
            <ul className={styles.featureList}>
              <li>✅ AdminSidebar (left navigation) following AppSidebar pattern</li>
              <li>✅ AdminLayout wrapper component</li>
              <li>✅ 4-card sidebar widgets (Stats, Help, Tips, Video)</li>
              <li>✅ Database schema with admin fields and audit logs</li>
              <li>✅ Middleware protection for /admin routes</li>
              <li>✅ HubPageLayout integration with HubTabs</li>
            </ul>
            <div className={styles.nextSteps}>
              <h3 className={styles.subsectionTitle}>Next Steps</h3>
              <p className={styles.description}>
                Phase 1 will implement SEO management pages (Hubs, Spokes, Citations, Configuration).
              </p>
            </div>
          </div>
        )}
        {tabFilter === 'activity' && (
          <HubEmptyState
            title="Activity Feed Coming Soon"
            description="Recent admin actions and platform activity will be displayed here."
          />
        )}
        {tabFilter === 'alerts' && (
          <HubEmptyState
            title="Alerts Coming Soon"
            description="Platform alerts and notifications will be displayed here."
          />
        )}
      </div>
    </HubPageLayout>
  );
}
