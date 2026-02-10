/*
 * Filename: src/app/(admin)/admin/listings/page.tsx
 * Purpose: Admin Listings overview page
 * Created: 2025-12-24
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
import { FileText, Eye, Calendar, FileEdit, TrendingUp, Activity } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import ListingsTable from './components/ListingsTable';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminListingsOverviewPage() {
  const _router = useRouter();
  const _canViewListings = usePermission('listings', 'view');
  const _canManageListings = usePermission('listings', 'manage');
  const [activeTab, setActiveTab] = useState<'overview' | 'all-listings'>('overview');

  // Fetch real-time listing counts from listings table
  const supabase = createClient();
  const { data: listingStats } = useQuery({
    queryKey: ['admin-listing-stats'],
    queryFn: async () => {
      const [totalRes, activeRes, inactiveRes, draftRes] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('listings').select('id', { count: 'exact', head: true }).in('status', ['unpublished', 'archived']),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      ]);
      return {
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        inactive: inactiveRes.count || 0,
        draft: draftRes.count || 0,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Fetch listings metrics with trend data from statistics table (for historical comparison)
  const totalListingsMetric = useAdminMetric({ metric: 'listings_total', compareWith: 'last_month' });
  const activeListingsMetric = useAdminMetric({ metric: 'listings_active', compareWith: 'last_month' });
  const inactiveListingsMetric = useAdminMetric({ metric: 'listings_inactive', compareWith: 'last_month' });
  const draftListingsMetric = useAdminMetric({ metric: 'listings_draft_count', compareWith: 'last_month' });
  const publishedRateMetric = useAdminMetric({ metric: 'listings_published_rate', compareWith: 'last_month' });
  const totalViewsMetric = useAdminMetric({ metric: 'listings_views_total', compareWith: 'last_month' });
  const totalBookingsMetric = useAdminMetric({ metric: 'listings_bookings_total', compareWith: 'last_month' });
  const activeRateMetric = useAdminMetric({ metric: 'listings_active_rate', compareWith: 'last_month' });

  // Header actions - removed redundant Filters button (now in table toolbar)
  const getHeaderActions = () => {
    return undefined;
  };

  // Fetch trend data from platform_statistics_daily (last 7 days)
  const listingTrendsQuery = useAdminTrendData({ metric: 'listings_total', days: 7 });
  const viewsTrendsQuery = useAdminTrendData({ metric: 'listings_views_total', days: 7 });
  const bookingsTrendsQuery = useAdminTrendData({ metric: 'listings_bookings_total', days: 7 });

  const isLoadingCharts = listingTrendsQuery.isLoading || viewsTrendsQuery.isLoading || bookingsTrendsQuery.isLoading;

  // Listing status breakdown data (using real-time counts)
  const listingStatusData: CategoryData[] = [
    { label: 'Active', value: listingStats?.active ?? 0, color: '#10B981' },
    { label: 'Inactive', value: listingStats?.inactive ?? 0, color: '#6B7280' },
    { label: 'Draft', value: listingStats?.draft ?? 0, color: '#F59E0B' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Listings"
          subtitle="Manage tutor listings and quality"
          actions={getHeaderActions()}
          className={styles.listingsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-listings', label: 'All Listings', count: listingStats?.total, active: activeTab === 'all-listings' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-listings')}
          className={styles.listingsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Listing Breakdown"
            stats={[
              { label: 'Total Listings', value: listingStats?.total ?? 0 },
              { label: 'Active', value: listingStats?.active ?? 0 },
              { label: 'Inactive', value: listingStats?.inactive ?? 0 },
              { label: 'Draft', value: listingStats?.draft ?? 0 },
            ]}
          />
          <AdminHelpWidget
            title="Listings Help"
            items={[
              { question: 'What is a listing?', answer: 'A listing is a service offering created by a tutor on the platform.' },
              { question: 'Why track active listings?', answer: 'Active listings are discoverable and can receive bookings.' },
              { question: 'How to improve listing quality?', answer: 'Monitor ratings, views, and booking conversion rates.' },
            ]}
          />
          <AdminTipWidget
            title="Listing Tips"
            tips={[
              'High view count with low bookings may indicate pricing issues',
              'Monitor published rate to encourage tutor engagement',
              'High draft count suggests tutors need help completing listings',
              'Active rate shows platform health',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards - All 8 cards in single grid */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Listings"
              value={totalListingsMetric.value}
              sublabel={formatMetricChange(
                totalListingsMetric.change,
                totalListingsMetric.changePercent,
                'last_month'
              )}
              icon={FileText}
              trend={totalListingsMetric.trend}
            />
            <HubKPICard
              label="Active"
              value={activeListingsMetric.value}
              sublabel={formatMetricChange(
                activeListingsMetric.change,
                activeListingsMetric.changePercent,
                'last_month'
              )}
              icon={FileText}
              trend={activeListingsMetric.trend}
            />
            <HubKPICard
              label="Inactive"
              value={inactiveListingsMetric.value}
              sublabel={formatMetricChange(
                inactiveListingsMetric.change,
                inactiveListingsMetric.changePercent,
                'last_month'
              )}
              icon={FileText}
              trend={inactiveListingsMetric.trend}
            />
            <HubKPICard
              label="Published Rate"
              value={`${publishedRateMetric.value}%`}
              sublabel={formatMetricChange(
                publishedRateMetric.change,
                publishedRateMetric.changePercent,
                'last_month'
              )}
              icon={TrendingUp}
              trend={publishedRateMetric.trend}
            />
            <HubKPICard
              label="Total Views"
              value={totalViewsMetric.value}
              sublabel={formatMetricChange(
                totalViewsMetric.change,
                totalViewsMetric.changePercent,
                'last_month'
              )}
              icon={Eye}
              trend={totalViewsMetric.trend}
            />
            <HubKPICard
              label="Total Bookings"
              value={totalBookingsMetric.value}
              sublabel={formatMetricChange(
                totalBookingsMetric.change,
                totalBookingsMetric.changePercent,
                'last_month'
              )}
              icon={Calendar}
              trend={totalBookingsMetric.trend}
            />
            <HubKPICard
              label="Draft Listings"
              value={draftListingsMetric.value}
              sublabel={formatMetricChange(
                draftListingsMetric.change,
                draftListingsMetric.changePercent,
                'last_month'
              )}
              icon={FileEdit}
              trend={draftListingsMetric.trend}
            />
            <HubKPICard
              label="Active Rate"
              value={`${activeRateMetric.value}%`}
              sublabel={formatMetricChange(
                activeRateMetric.change,
                activeRateMetric.changePercent,
                'last_month'
              )}
              icon={Activity}
              trend={activeRateMetric.trend}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* Listing Trends Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load listing trends chart</div>}>
              {listingTrendsQuery.isLoading ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={listingTrendsQuery.data}
                  title="Listing Trends"
                  subtitle="Last 7 days"
                  valueName="Listings"
                  lineColor="#3B82F6"
                />
              )}
            </ErrorBoundary>

            {/* Listing Status Breakdown */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load status breakdown chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={listingStatusData}
                  title="Listing Status Breakdown"
                  subtitle="Current distribution"
                />
              )}
            </ErrorBoundary>

            {/* Bookings Trends Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load bookings trends chart</div>}>
              {bookingsTrendsQuery.isLoading ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={bookingsTrendsQuery.data}
                  title="Listing Bookings Trends"
                  subtitle="Last 7 days"
                  valueName="Bookings"
                  lineColor="#10B981"
                />
              )}
            </ErrorBoundary>
          </div>

        </>
      )}

      {/* All Listings Tab */}
      {activeTab === 'all-listings' && (
        <ListingsTable />
      )}
    </HubPageLayout>
  );
}
