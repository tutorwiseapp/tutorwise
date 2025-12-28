/*
 * Filename: src/app/(admin)/admin/financials/payouts/page.tsx
 * Purpose: Admin Payouts page - Overview and management
 * Created: 2025-12-28
 * Phase: 2 - Platform Management
 * Pattern: Follows Bookings hub layout pattern
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type TrendDataPoint, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import PayoutsTable from './components/PayoutsTable';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'all-payouts'>('overview');

  // Fetch payout metrics with trend data from statistics table
  const totalPayoutsMetric = useAdminMetric({ metric: 'payouts_total', compareWith: 'last_month' });
  const pendingMetric = useAdminMetric({ metric: 'payouts_pending', compareWith: 'last_month' });
  const inTransitMetric = useAdminMetric({ metric: 'payouts_in_transit', compareWith: 'last_month' });
  const completedMetric = useAdminMetric({ metric: 'payouts_completed', compareWith: 'last_month' });
  const failedMetric = useAdminMetric({ metric: 'payouts_failed', compareWith: 'last_month' });
  const totalValueMetric = useAdminMetric({ metric: 'payouts_total_value', compareWith: 'last_month' });

  // Header actions
  const getHeaderActions = () => {
    return undefined;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Mock data for charts (TODO: Replace with real API data)
  const [isLoadingCharts] = useState(false);

  // Payout trends (last 7 days)
  const payoutTrendsData: TrendDataPoint[] = [
    { date: '2025-12-20', value: totalPayoutsMetric.value * 0.12, label: '20 Dec' },
    { date: '2025-12-21', value: totalPayoutsMetric.value * 0.14, label: '21 Dec' },
    { date: '2025-12-22', value: totalPayoutsMetric.value * 0.15, label: '22 Dec' },
    { date: '2025-12-23', value: totalPayoutsMetric.value * 0.13, label: '23 Dec' },
    { date: '2025-12-24', value: totalPayoutsMetric.value * 0.16, label: '24 Dec' },
    { date: '2025-12-25', value: totalPayoutsMetric.value * 0.14, label: '25 Dec' },
    { date: '2025-12-26', value: totalPayoutsMetric.value * 0.16, label: '26 Dec' },
  ];

  // Payout status breakdown
  const payoutStatusData: CategoryData[] = [
    { label: 'Pending', value: pendingMetric.value, color: '#F59E0B' },
    { label: 'In Transit', value: inTransitMetric.value, color: '#3B82F6' },
    { label: 'Completed', value: completedMetric.value, color: '#10B981' },
    { label: 'Failed', value: failedMetric.value, color: '#EF4444' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Payouts"
          subtitle="Manage platform payouts and approvals"
          actions={getHeaderActions()}
          className={styles.payoutsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-payouts', label: 'All Payouts', count: totalPayoutsMetric.value, active: activeTab === 'all-payouts' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-payouts')}
          className={styles.payoutsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Payout Breakdown"
            stats={[
              { label: 'Total', value: totalPayoutsMetric.value },
              { label: 'Pending', value: pendingMetric.value },
              { label: 'In Transit', value: inTransitMetric.value },
              { label: 'Completed', value: completedMetric.value },
              { label: 'Failed', value: failedMetric.value },
            ]}
          />
          <AdminHelpWidget
            title="Payouts Help"
            items={[
              { question: 'What are payouts?', answer: 'Payouts are transfers of earnings from the platform to tutor/agent bank accounts.' },
              { question: 'Approval process?', answer: 'Review pending payouts, verify details, and approve for processing. Completed payouts cannot be reversed.' },
            ]}
          />
          <AdminTipWidget
            title="Payout Tips"
            tips={[
              'Review pending payouts daily',
              'Verify bank details before approval',
              'Monitor failed payouts',
              'Check Stripe for payout status',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards Grid - All 5 cards in single grid */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Payouts"
              value={totalPayoutsMetric.value}
              sublabel={formatMetricChange(
                totalPayoutsMetric.change,
                totalPayoutsMetric.changePercent,
                'last_month'
              )}
              icon={DollarSign}
              trend={totalPayoutsMetric.trend}
            />
            <HubKPICard
              label="Pending"
              value={pendingMetric.value}
              sublabel={formatMetricChange(
                pendingMetric.change,
                pendingMetric.changePercent,
                'last_month'
              )}
              icon={Clock}
              trend={pendingMetric.trend}
            />
            <HubKPICard
              label="In Transit"
              value={inTransitMetric.value}
              sublabel={formatMetricChange(
                inTransitMetric.change,
                inTransitMetric.changePercent,
                'last_month'
              )}
              icon={Clock}
              trend={inTransitMetric.trend}
            />
            <HubKPICard
              label="Completed"
              value={completedMetric.value}
              sublabel={formatMetricChange(
                completedMetric.change,
                completedMetric.changePercent,
                'last_month'
              )}
              icon={CheckCircle}
              trend={completedMetric.trend}
            />
            <HubKPICard
              label="Failed"
              value={failedMetric.value}
              sublabel={formatMetricChange(
                failedMetric.change,
                failedMetric.changePercent,
                'last_month'
              )}
              icon={AlertCircle}
              trend={failedMetric.trend}
            />
            <HubKPICard
              label="Total Value"
              value={formatCurrency(totalValueMetric.value)}
              sublabel={
                totalValueMetric.change !== null
                  ? `${totalValueMetric.change >= 0 ? '+' : ''}${formatCurrency(totalValueMetric.change)} vs last month`
                  : undefined
              }
              icon={DollarSign}
              trend={totalValueMetric.trend}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* Payout Volume Trends Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load payout trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={payoutTrendsData}
                  title="Payout Trends"
                  subtitle="Last 7 days"
                  valueName="Payouts"
                  lineColor="#3B82F6"
                />
              )}
            </ErrorBoundary>

            {/* Payout Status Breakdown */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load status breakdown chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={payoutStatusData}
                  title="Payout Status Breakdown"
                  subtitle="Current distribution"
                />
              )}
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* All Payouts Tab */}
      {activeTab === 'all-payouts' && (
        <PayoutsTable />
      )}
    </HubPageLayout>
  );
}
