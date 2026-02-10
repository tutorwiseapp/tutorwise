/*
 * Filename: src/app/(admin)/admin/financials/disputes/page.tsx
 * Purpose: Admin Disputes page - Overview and management
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
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type TrendDataPoint, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import DisputesTable from './components/DisputesTable';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminDisputesPage() {
  const _router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'all-disputes'>('overview');

  // Fetch dispute metrics with trend data from statistics table
  const totalDisputesMetric = useAdminMetric({ metric: 'disputes_total', compareWith: 'last_month' });
  const actionRequiredMetric = useAdminMetric({ metric: 'disputes_action_required', compareWith: 'last_month' });
  const underReviewMetric = useAdminMetric({ metric: 'disputes_under_review', compareWith: 'last_month' });
  const wonMetric = useAdminMetric({ metric: 'disputes_won', compareWith: 'last_month' });
  const lostMetric = useAdminMetric({ metric: 'disputes_lost', compareWith: 'last_month' });

  // Header actions
  const getHeaderActions = () => {
    return undefined;
  };

  // Mock data for charts (TODO: Replace with real API data)
  const [isLoadingCharts] = useState(false);

  // Dispute trends (last 7 days)
  const disputeTrendsData: TrendDataPoint[] = [
    { date: '2025-12-20', value: totalDisputesMetric.value * 0.12, label: '20 Dec' },
    { date: '2025-12-21', value: totalDisputesMetric.value * 0.14, label: '21 Dec' },
    { date: '2025-12-22', value: totalDisputesMetric.value * 0.15, label: '22 Dec' },
    { date: '2025-12-23', value: totalDisputesMetric.value * 0.13, label: '23 Dec' },
    { date: '2025-12-24', value: totalDisputesMetric.value * 0.16, label: '24 Dec' },
    { date: '2025-12-25', value: totalDisputesMetric.value * 0.14, label: '25 Dec' },
    { date: '2025-12-26', value: totalDisputesMetric.value * 0.16, label: '26 Dec' },
  ];

  // Dispute status breakdown
  const disputeStatusData: CategoryData[] = [
    { label: 'Action Required', value: actionRequiredMetric.value, color: '#F59E0B' },
    { label: 'Under Review', value: underReviewMetric.value, color: '#3B82F6' },
    { label: 'Won', value: wonMetric.value, color: '#10B981' },
    { label: 'Lost', value: lostMetric.value, color: '#EF4444' },
  ];

  // Calculate win rate
  const totalResolved = wonMetric.value + lostMetric.value;
  const winRate = totalResolved > 0 ? Math.round((wonMetric.value / totalResolved) * 100) : 0;

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Disputes"
          subtitle="Manage platform disputes and mediation"
          actions={getHeaderActions()}
          className={styles.disputesHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-disputes', label: 'All Disputes', count: totalDisputesMetric.value, active: activeTab === 'all-disputes' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-disputes')}
          className={styles.disputesTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Dispute Breakdown"
            stats={[
              { label: 'Total', value: totalDisputesMetric.value },
              { label: 'Action Required', value: actionRequiredMetric.value },
              { label: 'Under Review', value: underReviewMetric.value },
              { label: 'Won', value: wonMetric.value },
              { label: 'Lost', value: lostMetric.value },
              { label: 'Win Rate', value: `${winRate}%` },
            ]}
          />
          <AdminHelpWidget
            title="Disputes Help"
            items={[
              { question: 'What are disputes?', answer: 'Disputes are customer complaints about payments, services, or bookings that require admin intervention.' },
              { question: 'Resolution process?', answer: 'Review evidence from both parties, investigate the issue, and make a fair decision. Won disputes favor the platform, lost disputes favor the customer.' },
            ]}
          />
          <AdminTipWidget
            title="Dispute Tips"
            tips={[
              'Respond to disputes within 7 days',
              'Gather all evidence before deciding',
              'Communicate clearly with both parties',
              'Document all decisions',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards Grid - All 4 cards in single grid */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Disputes"
              value={totalDisputesMetric.value}
              sublabel={formatMetricChange(
                totalDisputesMetric.change,
                totalDisputesMetric.changePercent,
                'last_month'
              )}
              icon={AlertCircle}
              trend={totalDisputesMetric.trend}
            />
            <HubKPICard
              label="Action Required"
              value={actionRequiredMetric.value}
              sublabel={formatMetricChange(
                actionRequiredMetric.change,
                actionRequiredMetric.changePercent,
                'last_month'
              )}
              icon={Clock}
              trend={actionRequiredMetric.trend}
            />
            <HubKPICard
              label="Under Review"
              value={underReviewMetric.value}
              sublabel={formatMetricChange(
                underReviewMetric.change,
                underReviewMetric.changePercent,
                'last_month'
              )}
              icon={Clock}
              trend={underReviewMetric.trend}
            />
            <HubKPICard
              label="Won"
              value={wonMetric.value}
              sublabel={formatMetricChange(
                wonMetric.change,
                wonMetric.changePercent,
                'last_month'
              )}
              icon={CheckCircle}
              trend={wonMetric.trend}
            />
            <HubKPICard
              label="Lost"
              value={lostMetric.value}
              sublabel={formatMetricChange(
                lostMetric.change,
                lostMetric.changePercent,
                'last_month'
              )}
              icon={XCircle}
              trend={lostMetric.trend}
            />
            <HubKPICard
              label="Win Rate"
              value={`${winRate}%`}
              sublabel={
                totalResolved > 0
                  ? `${wonMetric.value} won out of ${totalResolved} resolved`
                  : undefined
              }
              icon={CheckCircle}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* Dispute Volume Trends Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load dispute trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={disputeTrendsData}
                  title="Dispute Trends"
                  subtitle="Last 7 days"
                  valueName="Disputes"
                  lineColor="#EF4444"
                />
              )}
            </ErrorBoundary>

            {/* Dispute Status Breakdown */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load status breakdown chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={disputeStatusData}
                  title="Dispute Status Breakdown"
                  subtitle="Current distribution"
                />
              )}
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* All Disputes Tab */}
      {activeTab === 'all-disputes' && (
        <DisputesTable />
      )}
    </HubPageLayout>
  );
}
