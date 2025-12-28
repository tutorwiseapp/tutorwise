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
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type TrendDataPoint, type CategoryData } from '@/app/components/hub/charts';
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
  const router = useRouter();
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

  // Fetch referral metrics (placeholder - need to add these to platform_statistics_daily)
  // For now, using mock data similar to bookings pattern
  const totalReferralsMetric = useAdminMetric({ metric: 'total_users', compareWith: 'last_month' }); // Placeholder
  const activeReferralsMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add referrals_active metric
  const convertedReferralsMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add referrals_converted metric
  const conversionRateMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add referrals_conversion_rate metric
  const totalCommissionsMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add referrals_commissions_total metric
  const avgCommissionMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add referrals_avg_commission metric
  const clicksMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add referrals_clicks_total metric
  const signupsMetric = { value: 0, change: 0, changePercent: 0 }; // TODO: Add referrals_signups_total metric

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Mock chart data (TODO: Replace with useAdminTrendData when metrics exist)
  const [isLoadingCharts] = useState(false);

  // Referral trends data (last 7 days)
  const referralTrendsData: TrendDataPoint[] = [
    { date: '2025-12-20', value: 12, label: '20 Dec' },
    { date: '2025-12-21', value: 15, label: '21 Dec' },
    { date: '2025-12-22', value: 18, label: '22 Dec' },
    { date: '2025-12-23', value: 14, label: '23 Dec' },
    { date: '2025-12-24', value: 20, label: '24 Dec' },
    { date: '2025-12-25', value: 16, label: '25 Dec' },
    { date: '2025-12-26', value: 22, label: '26 Dec' },
  ];

  // Referral status breakdown data
  const referralStatusData: CategoryData[] = [
    { label: 'Converted', value: 45, color: '#10B981' },
    { label: 'Signed Up', value: 30, color: '#3B82F6' },
    { label: 'Referred', value: 50, color: '#F59E0B' },
    { label: 'Expired', value: 12, color: '#EF4444' },
  ];

  // Conversion funnel data
  const conversionFunnelData: CategoryData[] = [
    { label: 'Clicks', value: 500, color: '#8B5CF6' },
    { label: 'Sign Ups', value: 150, color: '#3B82F6' },
    { label: 'Conversions', value: 45, color: '#10B981' },
  ];

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
