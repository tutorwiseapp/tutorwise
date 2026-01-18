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
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget, AdminVideoWidget, AdminActivityWidget } from '@/app/components/admin/widgets';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import Button from '@/app/components/ui/actions/Button';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type TabFilter = 'dashboard' | 'activity' | 'alerts';

export default function AdminOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'dashboard';
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Tab change handler
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'dashboard') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/admin${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Fetch real platform statistics
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    error: statsError,
  } = useQuery({
    queryKey: ['admin', 'platform-stats'],
    queryFn: async () => {
      // Fetch total users count
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch active listings count
      const { count: activeListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch recent bookings (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: recentBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Fetch pending moderation items (reviews)
      const { count: pendingModeration } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch platform revenue (sum of completed bookings)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('status', 'completed');

      const platformRevenue = bookingsData?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;

      return {
        totalUsers: totalUsers || 0,
        activeListings: activeListings || 0,
        recentBookings: recentBookings || 0,
        pendingModeration: pendingModeration || 0,
        platformRevenue,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  return (
    <ErrorBoundary>
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
                      <button className={actionStyles.menuButton} onClick={() => router.push('/admin/accounts/users')}>
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
            { id: 'dashboard', label: 'Dashboard', active: tabFilter === 'dashboard' },
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
            stats={stats ? [
              { label: 'Total Users', value: stats.totalUsers },
              { label: 'Active Listings', value: stats.activeListings },
              { label: 'Recent Bookings', value: stats.recentBookings, valueColor: 'green' },
              { label: 'Pending Moderation', value: stats.pendingModeration, valueColor: stats.pendingModeration > 0 ? 'orange' : 'default' },
              { label: 'Platform Revenue', value: `£${(stats.platformRevenue / 100).toFixed(2)}`, valueColor: 'black-bold' },
            ] : [
              { label: 'Total Users', value: '...' },
              { label: 'Active Listings', value: '...' },
              { label: 'Recent Bookings', value: '...' },
              { label: 'Pending Moderation', value: '...' },
              { label: 'Platform Revenue', value: '...' },
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
        {tabFilter === 'dashboard' && (
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
          <div className={styles.activityContent}>
            <AdminActivityWidget title="Recent Admin Activity" limit={50} />
          </div>
        )}
        {tabFilter === 'alerts' && (
          <HubEmptyState
            title="Alerts Coming Soon"
            description="Platform alerts and notifications will be displayed here."
          />
        )}
      </div>
      </HubPageLayout>
    </ErrorBoundary>
  );
}
