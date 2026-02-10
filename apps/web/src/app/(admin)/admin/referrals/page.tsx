/*
 * Filename: src/app/(admin)/admin/referrals/page.tsx
 * Purpose: Admin Referrals overview page with KPIs and referral management
 * Created: 2025-12-27
 * Phase: 2 - Platform Management
 * Pattern: Follows admin bookings and listings structure
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
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import ReferralsTable from './components/ReferralsTable';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import { Users, UserCheck, TrendingUp, DollarSign, Percent, Link2 } from 'lucide-react';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminReferralsPage() {
  const _router = useRouter();
  const supabase = createClient();
  // TODO: Add 'referrals' to AdminResource type in lib/rbac/types.ts
  // const canViewReferrals = usePermission('referrals', 'view');
  // const canManageReferrals = usePermission('referrals', 'manage');
  const [activeTab, setActiveTab] = useState<'overview' | 'all-referrals'>('overview');

  // Fetch total referrals count
  const { data: referralsCountData } = useQuery({
    queryKey: ['admin-referrals-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  const referralsCount = referralsCountData || 0;

  // Fetch referral metrics from platform_statistics_daily
  const totalReferralsMetric = useAdminMetric({ metric: 'referrals_total', compareWith: 'last_month' });
  const activeReferralsMetric = useAdminMetric({ metric: 'referrals_active', compareWith: 'last_month' });
  const convertedReferralsMetric = useAdminMetric({ metric: 'referrals_converted', compareWith: 'last_month' });
  const conversionRateMetric = useAdminMetric({ metric: 'referrals_conversion_rate', compareWith: 'last_month' });
  const totalCommissionsMetric = useAdminMetric({ metric: 'referrals_commissions_total', compareWith: 'last_month' });
  const avgCommissionMetric = useAdminMetric({ metric: 'referrals_avg_commission', compareWith: 'last_month' });
  const clicksMetric = useAdminMetric({ metric: 'referrals_clicks_total', compareWith: 'last_month' });
  const signupsMetric = useAdminMetric({ metric: 'referrals_signups_total', compareWith: 'last_month' });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch real trend data from platform_statistics_daily
  const { data: referralTrendsData, isLoading: isLoadingTrends } = useAdminTrendData({
    metric: 'referrals_total',
    days: 7,
  });

  // Referral status breakdown data - calculated from current metrics
  const referralStatusData: CategoryData[] = [
    { label: 'Converted', value: convertedReferralsMetric.value, color: '#10B981' },
    { label: 'Active', value: activeReferralsMetric.value, color: '#3B82F6' },
    { label: 'Total', value: totalReferralsMetric.value, color: '#F59E0B' },
  ];

  // Conversion funnel data - calculated from current metrics
  const conversionFunnelData: CategoryData[] = [
    { label: 'Clicks', value: clicksMetric.value, color: '#8B5CF6' },
    { label: 'Sign Ups', value: signupsMetric.value, color: '#3B82F6' },
    { label: 'Conversions', value: convertedReferralsMetric.value, color: '#10B981' },
  ];

  const isLoadingCharts = isLoadingTrends;

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Referrals"
          subtitle="Manage platform referrals and track performance"
          className={styles.referralsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-referrals', label: 'All Referrals', count: referralsCount, active: activeTab === 'all-referrals' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-referrals')}
          className={styles.referralsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Referral Breakdown"
            stats={[
              { label: 'Total Referrals', value: referralsCount },
              { label: 'Converted', value: convertedReferralsMetric.value },
              { label: 'Active', value: activeReferralsMetric.value },
              { label: 'Conversion Rate', value: `${conversionRateMetric.value}%` },
            ]}
          />
          <AdminHelpWidget
            title="Referrals Help"
            items={[
              { question: 'What is a referral?', answer: 'A referral occurs when an agent shares their unique link and someone clicks it.' },
              { question: 'When does a referral convert?', answer: 'When the referred user signs up and completes their first booking.' },
              { question: 'How are commissions calculated?', answer: 'Agents earn a percentage of the first booking made by their referred users.' },
            ]}
          />
          <AdminTipWidget
            title="Referral Tips"
            tips={[
              'High conversion rates indicate quality referrals',
              'Monitor expired referrals for attribution issues',
              'Track top-performing agents for insights',
              'Commission trends show referral program health',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards Grid - All 8 cards in single grid */}
          <HubKPIGrid>
            {/* Row 1: Core Metrics */}
            <HubKPICard
              label="Total Referrals"
              value={totalReferralsMetric.value}
              sublabel={formatMetricChange(totalReferralsMetric.change, totalReferralsMetric.changePercent, 'last_month')}
              icon={Link2}
            />
            <HubKPICard
              label="Active Referrals"
              value={activeReferralsMetric.value}
              sublabel={formatMetricChange(activeReferralsMetric.change, activeReferralsMetric.changePercent, 'last_month')}
              icon={Users}
            />
            <HubKPICard
              label="Converted"
              value={convertedReferralsMetric.value}
              sublabel={formatMetricChange(convertedReferralsMetric.change, convertedReferralsMetric.changePercent, 'last_month')}
              icon={UserCheck}
            />
            <HubKPICard
              label="Conversion Rate"
              value={`${conversionRateMetric.value}%`}
              sublabel={formatMetricChange(conversionRateMetric.change, conversionRateMetric.changePercent, 'last_month')}
              icon={Percent}
            />

            {/* Row 2: Performance Metrics */}
            <HubKPICard
              label="Total Clicks"
              value={clicksMetric.value}
              sublabel={formatMetricChange(clicksMetric.change, clicksMetric.changePercent, 'last_month')}
              icon={TrendingUp}
            />
            <HubKPICard
              label="Total Signups"
              value={signupsMetric.value}
              sublabel={formatMetricChange(signupsMetric.change, signupsMetric.changePercent, 'last_month')}
              icon={UserCheck}
            />
            <HubKPICard
              label="Total Commissions"
              value={formatCurrency(totalCommissionsMetric.value)}
              sublabel={formatMetricChange(totalCommissionsMetric.change, totalCommissionsMetric.changePercent, 'last_month')}
              icon={DollarSign}
            />
            <HubKPICard
              label="Avg. Commission"
              value={formatCurrency(avgCommissionMetric.value)}
              sublabel={formatMetricChange(avgCommissionMetric.change, avgCommissionMetric.changePercent, 'last_month')}
              icon={DollarSign}
            />
          </HubKPIGrid>

          {/* Charts Section - 3 charts in responsive grid */}
          <div className={styles.chartsSection}>
            <ErrorBoundary>
              {isLoadingCharts ? (
                <ChartSkeleton />
              ) : (
                <HubTrendChart
                  title="Referral Trends"
                  data={referralTrendsData}
                  valueName="Referrals"
                  lineColor="#8B5CF6"
                />
              )}
            </ErrorBoundary>

            <ErrorBoundary>
              {isLoadingCharts ? (
                <ChartSkeleton />
              ) : (
                <HubCategoryBreakdownChart
                  title="Status Breakdown"
                  data={referralStatusData}
                />
              )}
            </ErrorBoundary>

            <ErrorBoundary>
              {isLoadingCharts ? (
                <ChartSkeleton />
              ) : (
                <HubCategoryBreakdownChart
                  title="Conversion Funnel"
                  data={conversionFunnelData}
                />
              )}
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* All Referrals Tab */}
      {activeTab === 'all-referrals' && (
        <div className={styles.tableContainer}>
          <ReferralsTable />
        </div>
      )}
    </HubPageLayout>
  );
}
