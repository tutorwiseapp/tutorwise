/**
 * Filename: page.tsx
 * Purpose: Admin Organisations Management Page
 * Created: 2025-12-27
 * Phase: 2 - Platform Management
 * Pattern: Follows admin bookings, listings, and referrals structure
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
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type TrendDataPoint, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import OrganisationsTable from './components/OrganisationsTable';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminOrganisationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'all-organisations'>('overview');

  // Fetch total organisations count
  const { data: organisationsCountData } = useQuery({
    queryKey: ['admin-organisations-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('connection_groups')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'organisation');

      if (error) throw error;
      return count || 0;
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  const organisationsCount = organisationsCountData || 0;

  // Fetch organisation metrics (placeholder - need to add these to platform_statistics_daily)
  const totalOrganisationsMetric = useAdminMetric({ metric: 'total_users', compareWith: 'last_month' }); // Placeholder
  const activeOrganisationsMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add organisations_active metric
  const totalMembersMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add organisations_total_members metric
  const avgMembersMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add organisations_avg_members metric
  const totalRevenueMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add organisations_total_revenue metric
  const avgRevenueMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add organisations_avg_revenue metric

  // Placeholder chart data
  const orgTrendData: TrendDataPoint[] = [];
  const orgTypeBreakdownData: CategoryData[] = [];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Organisations"
          subtitle="Manage platform organisations and track performance"
          className={styles.organisationsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-organisations', label: 'All Organisations', count: organisationsCount, active: activeTab === 'all-organisations' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-organisations')}
          className={styles.organisationsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Organisation Breakdown"
            stats={[
              { label: 'Total Organisations', value: organisationsCount },
              { label: 'Active', value: activeOrganisationsMetric.value },
              { label: 'Total Members', value: totalMembersMetric.value },
              { label: 'Avg. Members', value: avgMembersMetric.value },
            ]}
          />
          <AdminHelpWidget
            title="Organisations Help"
            items={[
              { question: 'View details', answer: 'Click any organisation to see full information' },
              { question: 'Manage members', answer: 'View and manage organisation members' },
              { question: 'Subscription status', answer: 'Track premium subscriptions' },
            ]}
          />
          <AdminTipWidget
            title="Pro Tip"
            tips={[
              'Use filters to quickly find organisations by type, subscription status, or member count.'
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* SINGLE KPI Grid with all 6 cards */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Organisations"
              value={totalOrganisationsMetric.value}
              trend={(totalOrganisationsMetric.change ?? 0) >= 0 ? 'up' : 'down'}
              sublabel={formatMetricChange(totalOrganisationsMetric.change, totalOrganisationsMetric.changePercent, 'last_month')}
            />
            <HubKPICard
              label="Active"
              value={activeOrganisationsMetric.value}
              trend={(activeOrganisationsMetric.change ?? 0) >= 0 ? 'up' : 'down'}
              sublabel={formatMetricChange(activeOrganisationsMetric.change, activeOrganisationsMetric.changePercent, 'last_month')}
            />
            <HubKPICard
              label="Total Members"
              value={totalMembersMetric.value}
              trend={(totalMembersMetric.change ?? 0) >= 0 ? 'up' : 'down'}
              sublabel={formatMetricChange(totalMembersMetric.change, totalMembersMetric.changePercent, 'last_month')}
            />
            <HubKPICard
              label="Avg. Members"
              value={avgMembersMetric.value.toFixed(1)}
              trend={(avgMembersMetric.change ?? 0) >= 0 ? 'up' : 'down'}
              sublabel={formatMetricChange(avgMembersMetric.change, avgMembersMetric.changePercent, 'last_month')}
            />
            <HubKPICard
              label="Total Revenue"
              value={`£${totalRevenueMetric.value.toLocaleString()}`}
              trend={(totalRevenueMetric.change ?? 0) >= 0 ? 'up' : 'down'}
              sublabel={formatMetricChange(totalRevenueMetric.change, totalRevenueMetric.changePercent, 'last_month')}
            />
            <HubKPICard
              label="Avg. Revenue"
              value={`£${avgRevenueMetric.value.toLocaleString()}`}
              trend={(avgRevenueMetric.change ?? 0) >= 0 ? 'up' : 'down'}
              sublabel={formatMetricChange(avgRevenueMetric.change, avgRevenueMetric.changePercent, 'last_month')}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            <ErrorBoundary>
              <HubTrendChart
                title="Organisation Growth"
                data={orgTrendData}
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <HubCategoryBreakdownChart
                title="Organisation Type Distribution"
                data={orgTypeBreakdownData}
              />
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* All Organisations Tab */}
      {activeTab === 'all-organisations' && (
        <div className={styles.tableContainer}>
          <OrganisationsTable />
        </div>
      )}
    </HubPageLayout>
  );
}
