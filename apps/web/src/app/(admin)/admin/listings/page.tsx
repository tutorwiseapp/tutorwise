/*
 * Filename: src/app/(admin)/admin/listings/page.tsx
 * Purpose: Admin Listings overview page
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
import { FileText, Eye, Calendar, Star, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type TrendDataPoint, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import ListingsTable from './components/ListingsTable';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminListingsOverviewPage() {
  const router = useRouter();
  const canViewListings = usePermission('listings', 'view');
  const canManageListings = usePermission('listings', 'manage');
  const [activeTab, setActiveTab] = useState<'overview' | 'all-listings'>('overview');

  // Fetch listings metrics with trend data from statistics table
  const totalListingsMetric = useAdminMetric({ metric: 'listings_total', compareWith: 'last_month' });
  const activeListingsMetric = useAdminMetric({ metric: 'listings_active', compareWith: 'last_month' });
  const inactiveListingsMetric = useAdminMetric({ metric: 'listings_inactive', compareWith: 'last_month' });
  const publishedRateMetric = useAdminMetric({ metric: 'listings_published_rate', compareWith: 'last_month' });
  const totalViewsMetric = useAdminMetric({ metric: 'listings_views_total', compareWith: 'last_month' });
  const totalBookingsMetric = useAdminMetric({ metric: 'listings_bookings_total', compareWith: 'last_month' });
  const avgRatingMetric = useAdminMetric({ metric: 'listings_avg_rating', compareWith: 'last_month' });
  const activeRateMetric = useAdminMetric({ metric: 'listings_active_rate', compareWith: 'last_month' });

  // Header actions - removed redundant Filters button (now in table toolbar)
  const getHeaderActions = () => {
    return undefined;
  };

  // Mock data for charts (TODO: Replace with real API data)
  const [isLoadingCharts] = useState(false);

  // Listing trends data (last 7 days)
  const listingTrendsData: TrendDataPoint[] = [
    { date: '2025-12-20', value: totalListingsMetric.value * 0.12, label: '20 Dec' },
    { date: '2025-12-21', value: totalListingsMetric.value * 0.14, label: '21 Dec' },
    { date: '2025-12-22', value: totalListingsMetric.value * 0.15, label: '22 Dec' },
    { date: '2025-12-23', value: totalListingsMetric.value * 0.13, label: '23 Dec' },
    { date: '2025-12-24', value: totalListingsMetric.value * 0.16, label: '24 Dec' },
    { date: '2025-12-25', value: totalListingsMetric.value * 0.14, label: '25 Dec' },
    { date: '2025-12-26', value: totalListingsMetric.value * 0.16, label: '26 Dec' },
  ];

  // Listing status breakdown data
  const listingStatusData: CategoryData[] = [
    { label: 'Active', value: activeListingsMetric.value, color: '#10B981' },
    { label: 'Inactive', value: inactiveListingsMetric.value, color: '#6B7280' },
    { label: 'Draft', value: Math.floor(totalListingsMetric.value * 0.15), color: '#F59E0B' },
    { label: 'Archived', value: Math.floor(totalListingsMetric.value * 0.05), color: '#EF4444' },
  ];

  // Engagement trends data (last 7 days)
  const engagementTrendsData: TrendDataPoint[] = [
    { date: '2025-12-20', value: totalViewsMetric.value * 0.12, label: '20 Dec' },
    { date: '2025-12-21', value: totalViewsMetric.value * 0.14, label: '21 Dec' },
    { date: '2025-12-22', value: totalViewsMetric.value * 0.15, label: '22 Dec' },
    { date: '2025-12-23', value: totalViewsMetric.value * 0.13, label: '23 Dec' },
    { date: '2025-12-24', value: totalViewsMetric.value * 0.16, label: '24 Dec' },
    { date: '2025-12-25', value: totalViewsMetric.value * 0.14, label: '25 Dec' },
    { date: '2025-12-26', value: totalViewsMetric.value * 0.16, label: '26 Dec' },
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
            { id: 'all-listings', label: 'All Listings', count: totalListingsMetric.value, active: activeTab === 'all-listings' }
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
              { label: 'Total Listings', value: totalListingsMetric.value },
              { label: 'Active', value: activeListingsMetric.value },
              { label: 'Inactive', value: inactiveListingsMetric.value },
              { label: 'Draft', value: Math.floor(totalListingsMetric.value * 0.15) },
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
              'Track avg rating for quality control',
              'Active rate shows platform health',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards - Row 1: Listing Counts */}
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
          </HubKPIGrid>

          {/* KPI Cards - Row 2: Engagement */}
          <HubKPIGrid className={styles.secondRowGrid}>
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
              label="Avg. Rating"
              value={avgRatingMetric.value > 0 ? `${avgRatingMetric.value.toFixed(1)}/5.0` : 'N/A'}
              sublabel={
                avgRatingMetric.change !== null
                  ? `${avgRatingMetric.change >= 0 ? '+' : ''}${avgRatingMetric.change.toFixed(1)} vs last month`
                  : undefined
              }
              icon={Star}
              trend={avgRatingMetric.trend}
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
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={listingTrendsData}
                  title="Listing Trends"
                  subtitle="Last 7 days"
                  valueLabel="Listings"
                  color="#3B82F6"
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

            {/* Engagement Trends Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load engagement trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={engagementTrendsData}
                  title="Views & Bookings Trends"
                  subtitle="Last 7 days"
                  valueLabel="Count"
                  color="#10B981"
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
