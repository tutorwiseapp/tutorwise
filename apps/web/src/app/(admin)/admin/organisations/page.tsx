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

  // Fetch real organisation metrics from database
  const { data: metricsData } = useQuery({
    queryKey: ['admin-organisations-metrics'],
    queryFn: async () => {
      const supabase = createClient();

      // Get current metrics
      const { data: currentOrgs, error: currentError } = await supabase
        .from('connection_groups')
        .select('id, member_count, created_at')
        .eq('type', 'organisation');

      if (currentError) throw currentError;

      // Get metrics from 30 days ago for comparison
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: previousOrgs, error: previousError } = await supabase
        .from('connection_groups')
        .select('id, member_count')
        .eq('type', 'organisation')
        .lte('created_at', thirtyDaysAgo.toISOString());

      if (previousError) throw previousError;

      const currentCount = currentOrgs?.length || 0;
      const previousCount = previousOrgs?.length || 0;
      const totalMembers = currentOrgs?.reduce((sum, org) => sum + (org.member_count || 0), 0) || 0;
      const avgMembers = currentCount > 0 ? totalMembers / currentCount : 0;

      const previousTotalMembers = previousOrgs?.reduce((sum, org) => sum + (org.member_count || 0), 0) || 0;
      const previousAvgMembers = previousCount > 0 ? previousTotalMembers / previousCount : 0;

      return {
        total: currentCount,
        previousTotal: previousCount,
        totalMembers,
        previousTotalMembers,
        avgMembers,
        previousAvgMembers,
        currentOrgs: currentOrgs || [],
      };
    },
    staleTime: 60 * 1000,
  });

  // Calculate metrics with real data
  const totalOrganisationsMetric = {
    value: metricsData?.total || 0,
    previousValue: metricsData?.previousTotal || 0,
    change: (metricsData?.total || 0) - (metricsData?.previousTotal || 0),
    changePercent: metricsData?.previousTotal
      ? (((metricsData.total - metricsData.previousTotal) / metricsData.previousTotal) * 100)
      : 0,
    trend: ((metricsData?.total || 0) - (metricsData?.previousTotal || 0)) >= 0 ? 'up' as const : 'down' as const,
  };

  const activeOrganisationsMetric = {
    value: metricsData?.total || 0, // All organisations are considered active
    change: (metricsData?.total || 0) - (metricsData?.previousTotal || 0),
    changePercent: totalOrganisationsMetric.changePercent,
    trend: totalOrganisationsMetric.trend,
  };

  const totalMembersMetric = {
    value: metricsData?.totalMembers || 0,
    change: (metricsData?.totalMembers || 0) - (metricsData?.previousTotalMembers || 0),
    changePercent: metricsData?.previousTotalMembers
      ? (((metricsData.totalMembers - metricsData.previousTotalMembers) / metricsData.previousTotalMembers) * 100)
      : 0,
    trend: ((metricsData?.totalMembers || 0) - (metricsData?.previousTotalMembers || 0)) >= 0 ? 'up' as const : 'down' as const,
  };

  const avgMembersMetric = {
    value: metricsData?.avgMembers || 0,
    change: (metricsData?.avgMembers || 0) - (metricsData?.previousAvgMembers || 0),
    changePercent: metricsData?.previousAvgMembers
      ? (((metricsData.avgMembers - metricsData.previousAvgMembers) / metricsData.previousAvgMembers) * 100)
      : 0,
    trend: ((metricsData?.avgMembers || 0) - (metricsData?.previousAvgMembers || 0)) >= 0 ? 'up' as const : 'down' as const,
  };

  // Revenue metrics (set to 0 as organisations don't have direct revenue tracking)
  const totalRevenueMetric = { value: 0, change: 0, changePercent: 0, trend: 'neutral' as const };
  const avgRevenueMetric = { value: 0, change: 0, changePercent: 0, trend: 'neutral' as const };

  // Fetch real chart data - Organisation Growth Trend
  const { data: trendData } = useQuery({
    queryKey: ['admin-organisations-trend'],
    queryFn: async () => {
      const supabase = createClient();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('connection_groups')
        .select('created_at')
        .eq('type', 'organisation')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const groupedByDate: Record<string, number> = {};
      data?.forEach(org => {
        const date = new Date(org.created_at).toISOString().split('T')[0];
        groupedByDate[date] = (groupedByDate[date] || 0) + 1;
      });

      // Create trend data for last 7 days
      const trendPoints: TrendDataPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        trendPoints.push({
          date: dateStr,
          value: groupedByDate[dateStr] || 0,
          label,
        });
      }

      return trendPoints;
    },
    staleTime: 60 * 1000,
  });

  // Fetch real chart data - Organisation Size Distribution
  const { data: typeBreakdownData } = useQuery({
    queryKey: ['admin-organisations-size-breakdown'],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('connection_groups')
        .select('member_count')
        .eq('type', 'organisation');

      if (error) throw error;

      // Group by member size
      const small = data?.filter(org => (org.member_count || 0) <= 5).length || 0;
      const medium = data?.filter(org => (org.member_count || 0) > 5 && (org.member_count || 0) <= 20).length || 0;
      const large = data?.filter(org => (org.member_count || 0) > 20).length || 0;

      return [
        { label: 'Small (1-5)', value: small, color: '#3B82F6' },
        { label: 'Medium (6-20)', value: medium, color: '#10B981' },
        { label: 'Large (20+)', value: large, color: '#F59E0B' },
      ];
    },
    staleTime: 60 * 1000,
  });

  // Fetch real chart data - Member Growth Trend
  const { data: memberTrendData } = useQuery({
    queryKey: ['admin-organisations-member-trend'],
    queryFn: async () => {
      const supabase = createClient();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('connection_groups')
        .select('created_at, member_count')
        .eq('type', 'organisation')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date and sum member counts
      const groupedByDate: Record<string, number> = {};
      data?.forEach(org => {
        const date = new Date(org.created_at).toISOString().split('T')[0];
        groupedByDate[date] = (groupedByDate[date] || 0) + (org.member_count || 0);
      });

      // Create trend data for last 7 days
      const trendPoints: TrendDataPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        trendPoints.push({
          date: dateStr,
          value: groupedByDate[dateStr] || 0,
          label,
        });
      }

      return trendPoints;
    },
    staleTime: 60 * 1000,
  });

  const orgTrendData: TrendDataPoint[] = trendData || [];
  const orgTypeBreakdownData: CategoryData[] = typeBreakdownData || [];
  const orgMemberTrendData: TrendDataPoint[] = memberTrendData || [];

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
          {/* KPI Grid with all 8 cards */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Organisations"
              value={totalOrganisationsMetric.value}
              trend={totalOrganisationsMetric.trend}
              sublabel={formatMetricChange(totalOrganisationsMetric.change, totalOrganisationsMetric.changePercent, 'last_month')}
            />
            <HubKPICard
              label="Active"
              value={activeOrganisationsMetric.value}
              trend={activeOrganisationsMetric.trend}
              sublabel={formatMetricChange(activeOrganisationsMetric.change, activeOrganisationsMetric.changePercent, 'last_month')}
            />
            <HubKPICard
              label="New This Month"
              value={totalOrganisationsMetric.change >= 0 ? totalOrganisationsMetric.change : 0}
              trend={totalOrganisationsMetric.trend}
              sublabel={`${totalOrganisationsMetric.changePercent.toFixed(1)}% vs last month`}
            />
            <HubKPICard
              label="Growth Rate"
              value={`${totalOrganisationsMetric.changePercent >= 0 ? '+' : ''}${totalOrganisationsMetric.changePercent.toFixed(1)}%`}
              trend={totalOrganisationsMetric.trend}
              sublabel="Month over month"
            />
            <HubKPICard
              label="Total Members"
              value={totalMembersMetric.value}
              trend={totalMembersMetric.trend}
              sublabel={formatMetricChange(totalMembersMetric.change, totalMembersMetric.changePercent, 'last_month')}
            />
            <HubKPICard
              label="Avg. Members/Org"
              value={avgMembersMetric.value.toFixed(1)}
              trend={avgMembersMetric.trend}
              sublabel={formatMetricChange(avgMembersMetric.change, avgMembersMetric.changePercent, 'last_month')}
            />
            <HubKPICard
              label="Largest Org"
              value={metricsData?.total ? Math.max(...(metricsData as any).currentOrgs?.map((org: any) => org.member_count || 0) || [0]) : 0}
              sublabel="members"
            />
            <HubKPICard
              label="Smallest Org"
              value={metricsData?.total ? Math.min(...(metricsData as any).currentOrgs?.filter((org: any) => (org.member_count || 0) > 0).map((org: any) => org.member_count || 0) || [0]) : 0}
              sublabel="members"
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            <ErrorBoundary>
              <HubTrendChart
                title="Organisation Growth"
                subtitle="Last 7 days"
                data={orgTrendData}
                valueName="New Organisations"
                lineColor="#3B82F6"
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <HubTrendChart
                title="Member Growth"
                subtitle="Last 7 days"
                data={orgMemberTrendData}
                valueName="New Members"
                lineColor="#10B981"
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <HubCategoryBreakdownChart
                title="Organisation Size Distribution"
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
