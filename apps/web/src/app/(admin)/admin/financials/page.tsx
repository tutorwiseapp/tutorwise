/*
 * Filename: src/app/(admin)/admin/financials/page.tsx
 * Purpose: Admin Transactions page - Overview and management
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
import { DollarSign, TrendingUp, Clock, AlertCircle, PiggyBank } from 'lucide-react';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import TransactionsTable from './components/TransactionsTable';
import ReconciliationDashboard from './components/ReconciliationDashboard';
import DisputesManagement from './components/DisputesManagement';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminFinancialsPage() {
  const _router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'reconciliation' | 'disputes' | 'all-transactions'>('overview');

  // Fetch transaction metrics with trend data from statistics table
  const totalTransactionsMetric = useAdminMetric({ metric: 'transactions_total', compareWith: 'last_month' });
  const clearingMetric = useAdminMetric({ metric: 'transactions_clearing', compareWith: 'last_month' });
  const availableMetric = useAdminMetric({ metric: 'transactions_available', compareWith: 'last_month' });
  const paidOutMetric = useAdminMetric({ metric: 'transactions_paid_out', compareWith: 'last_month' });
  const disputedMetric = useAdminMetric({ metric: 'transactions_disputed', compareWith: 'last_month' });
  const refundedMetric = useAdminMetric({ metric: 'transactions_refunded', compareWith: 'last_month' });
  const platformRevenueMetric = useAdminMetric({ metric: 'platform_revenue', compareWith: 'last_month' });

  // Header actions
  const getHeaderActions = () => {
    return undefined;
  };

  // Format currency
  const _formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch real trend data from platform_statistics_daily
  const { data: transactionTrendsData, isLoading: isLoadingTrends } = useAdminTrendData({
    metric: 'transactions_total',
    days: 7,
  });

  const isLoadingCharts = isLoadingTrends;

  // Transaction status breakdown
  const transactionStatusData: CategoryData[] = [
    { label: 'Clearing', value: clearingMetric.value, color: '#F59E0B' },
    { label: 'Available', value: availableMetric.value, color: '#10B981' },
    { label: 'Paid Out', value: paidOutMetric.value, color: '#3B82F6' },
    { label: 'Disputed', value: disputedMetric.value, color: '#EF4444' },
    { label: 'Refunded', value: refundedMetric.value, color: '#6B7280' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Transactions"
          subtitle="Manage platform transactions and payments"
          actions={getHeaderActions()}
          className={styles.transactionsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'reconciliation', label: 'Reconciliation', active: activeTab === 'reconciliation' },
            { id: 'disputes', label: 'Disputes', count: disputedMetric.value, active: activeTab === 'disputes' },
            { id: 'all-transactions', label: 'All Transactions', count: totalTransactionsMetric.value, active: activeTab === 'all-transactions' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'reconciliation' | 'disputes' | 'all-transactions')}
          className={styles.transactionsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Transaction Breakdown"
            stats={[
              { label: 'Total', value: totalTransactionsMetric.value },
              { label: 'Clearing', value: clearingMetric.value },
              { label: 'Available', value: availableMetric.value },
              { label: 'Paid Out', value: paidOutMetric.value },
              { label: 'Disputed', value: disputedMetric.value },
              { label: 'Refunded', value: refundedMetric.value },
            ]}
          />
          <AdminHelpWidget
            title="Transactions Help"
            items={[
              { question: 'What are transactions?', answer: 'View all platform transactions including bookings, payouts, and refunds across all users.' },
              { question: 'Transaction statuses?', answer: 'Clearing: Processing, Available: Ready for payout, Paid Out: Completed, Disputed: Under review, Refunded: Returned.' },
            ]}
          />
          <AdminTipWidget
            title="Financial Tips"
            tips={[
              'Monitor disputed transactions daily',
              'Review pending payouts weekly',
              'Export data for accounting',
              'Check Stripe Dashboard for details',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards Grid - All 7 cards in single grid */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Transactions"
              value={totalTransactionsMetric.value}
              sublabel={formatMetricChange(
                totalTransactionsMetric.change,
                totalTransactionsMetric.changePercent,
                'last_month'
              )}
              icon={DollarSign}
              trend={totalTransactionsMetric.trend}
            />
            <HubKPICard
              label="Platform Revenue"
              value={`£${(platformRevenueMetric.value / 100).toFixed(0)}`}
              sublabel={formatMetricChange(
                platformRevenueMetric.change,
                platformRevenueMetric.changePercent,
                'last_month'
              )}
              icon={PiggyBank}
              trend={platformRevenueMetric.trend}
            />
            <HubKPICard
              label="Clearing"
              value={clearingMetric.value}
              sublabel={formatMetricChange(
                clearingMetric.change,
                clearingMetric.changePercent,
                'last_month'
              )}
              icon={Clock}
              trend={clearingMetric.trend}
            />
            <HubKPICard
              label="Available"
              value={availableMetric.value}
              sublabel={formatMetricChange(
                availableMetric.change,
                availableMetric.changePercent,
                'last_month'
              )}
              icon={TrendingUp}
              trend={availableMetric.trend}
            />
            <HubKPICard
              label="Paid Out"
              value={paidOutMetric.value}
              sublabel={formatMetricChange(
                paidOutMetric.change,
                paidOutMetric.changePercent,
                'last_month'
              )}
              icon={DollarSign}
              trend={paidOutMetric.trend}
            />
            <HubKPICard
              label="Disputed"
              value={disputedMetric.value}
              sublabel={formatMetricChange(
                disputedMetric.change,
                disputedMetric.changePercent,
                'last_month'
              )}
              icon={AlertCircle}
              trend={disputedMetric.trend}
            />
            <HubKPICard
              label="Refunded"
              value={refundedMetric.value}
              sublabel={formatMetricChange(
                refundedMetric.change,
                refundedMetric.changePercent,
                'last_month'
              )}
              icon={DollarSign}
              trend={refundedMetric.trend}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* Transaction Volume Trends Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load transaction trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={transactionTrendsData}
                  title="Transaction Volume"
                  subtitle="Last 7 days"
                  valueName="Transactions"
                  lineColor="#3B82F6"
                />
              )}
            </ErrorBoundary>

            {/* Transaction Status Breakdown */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load status breakdown chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={transactionStatusData}
                  title="Transaction Status Breakdown"
                  subtitle="Current distribution"
                />
              )}
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* Reconciliation Tab */}
      {activeTab === 'reconciliation' && (
        <ReconciliationDashboard />
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <DisputesManagement />
      )}

      {/* All Transactions Tab */}
      {activeTab === 'all-transactions' && (
        <TransactionsTable />
      )}
    </HubPageLayout>
  );
}
