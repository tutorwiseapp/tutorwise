/*
 * Filename: src/app/(admin)/admin/edupay/page.tsx
 * Purpose: Admin EduPay dashboard - Overview and management of EP wallets, conversions, and rules
 * Created: 2026-02-12
 * Phase: 2 - Platform Management
 * Pattern: Follows Admin Dashboard Gold Standard (6-DESIGN-SYSTEM.md Section 7.2)
 */
'use client';

import React, { useState } from 'react';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { Wallet, TrendingUp, RefreshCw, AlertCircle, Users, Banknote } from 'lucide-react';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type CategoryData } from '@/app/components/hub/charts';
import { useAdminEduPayMetrics } from './hooks/useAdminEduPayMetrics';
import { useAdminEduPayTrends } from './hooks/useAdminEduPayTrends';
import WalletsTable from './components/WalletsTable';
import ConversionsTable from './components/ConversionsTable';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminEduPayPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'wallets' | 'conversions'>('overview');

  // Fetch EduPay metrics
  const {
    totalEpInCirculation,
    totalWallets,
    activeWallets,
    totalConversions,
    pendingConversions,
    failedConversions,
    completedConversions,
    totalEpConverted,
    platformFeesCollected,
    isLoading: isLoadingMetrics,
  } = useAdminEduPayMetrics();

  // Fetch trend data for charts
  const { data: epTrendData, isLoading: isLoadingTrends } = useAdminEduPayTrends({ days: 7 });

  const isLoadingCharts = isLoadingMetrics || isLoadingTrends;

  // Conversion status breakdown for pie chart
  const conversionStatusData: CategoryData[] = [
    { label: 'Completed', value: completedConversions, color: '#10B981' },
    { label: 'Pending', value: pendingConversions, color: '#F59E0B' },
    { label: 'Failed', value: failedConversions, color: '#EF4444' },
  ];

  // Format EP value with commas
  const formatEP = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  // Format currency
  const formatCurrency = (pence: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(pence / 100);
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="EduPay Management"
          subtitle="Monitor EP wallets, conversions, and platform earnings"
          className={styles.edupayHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'wallets', label: 'Wallets', count: activeWallets, active: activeTab === 'wallets' },
            { id: 'conversions', label: 'Conversions', count: totalConversions, active: activeTab === 'conversions' },
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'wallets' | 'conversions')}
          className={styles.edupayTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="EduPay Breakdown"
            stats={[
              { label: 'Total EP in Circulation', value: formatEP(totalEpInCirculation) },
              { label: 'Total Wallets', value: totalWallets },
              { label: 'Active Wallets', value: activeWallets },
              { label: 'Total Conversions', value: totalConversions },
              { label: 'Pending Conversions', value: pendingConversions },
              { label: 'Platform Fees (10%)', value: formatCurrency(platformFeesCollected) },
            ]}
          />
          <AdminHelpWidget
            title="EduPay Help"
            items={[
              { question: 'What is EP?', answer: 'Education Points (EP) are earned from tutoring income, referrals, and affiliate cashback. 100 EP = £1.' },
              { question: 'Conversion destinations?', answer: 'Users can convert EP to: Student Loan payments (TrueLayer), ISA accounts, or Savings accounts.' },
              { question: 'Platform fee?', answer: 'Tutorwise takes a flat 10% platform fee on all EP conversions. 90% goes to the user.' },
            ]}
          />
          <AdminTipWidget
            title="Admin Tips"
            tips={[
              'Monitor failed conversions daily for TrueLayer issues',
              'Check wallet balances match ledger entries for reconciliation',
              'Review pending conversions older than 24h',
              'Export compliance reports monthly for tax purposes',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards Grid */}
          <HubKPIGrid>
            <HubKPICard
              label="Total EP in Circulation"
              value={formatEP(totalEpInCirculation)}
              sublabel="Across all wallets"
              icon={Wallet}
              trend="neutral"
            />
            <HubKPICard
              label="Active Wallets"
              value={activeWallets}
              sublabel={`of ${totalWallets} total`}
              icon={Users}
              trend="neutral"
            />
            <HubKPICard
              label="Total Conversions"
              value={totalConversions}
              sublabel="All time"
              icon={RefreshCw}
              trend="neutral"
            />
            <HubKPICard
              label="Pending Conversions"
              value={pendingConversions}
              sublabel="Awaiting completion"
              icon={AlertCircle}
              trend={pendingConversions > 5 ? 'down' : 'neutral'}
            />
            <HubKPICard
              label="EP Converted"
              value={formatEP(totalEpConverted)}
              sublabel="Total EP processed"
              icon={TrendingUp}
              trend="up"
            />
            <HubKPICard
              label="Platform Fees"
              value={formatCurrency(platformFeesCollected)}
              sublabel="10% of conversions"
              icon={Banknote}
              trend="up"
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* EP Earning Trends Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load EP trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={epTrendData || []}
                  title="EP Earning Activity"
                  subtitle="Last 7 days"
                  valueName="EP Earned"
                  lineColor="#006c67"
                />
              )}
            </ErrorBoundary>

            {/* Conversion Status Breakdown */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load conversion breakdown</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={conversionStatusData}
                  title="Conversion Status Breakdown"
                  subtitle="Current distribution"
                />
              )}
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <WalletsTable />
      )}

      {/* Conversions Tab */}
      {activeTab === 'conversions' && (
        <ConversionsTable />
      )}
    </HubPageLayout>
  );
}
