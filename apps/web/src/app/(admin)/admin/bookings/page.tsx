/*
 * Filename: src/app/(admin)/admin/bookings/page.tsx
 * Purpose: Admin Bookings overview page
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
import { Calendar, DollarSign, Clock, Filter } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type TrendDataPoint, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import BookingsTable from './components/BookingsTable';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminBookingsOverviewPage() {
  const router = useRouter();
  const canViewBookings = usePermission('bookings', 'view');
  const canManageBookings = usePermission('bookings', 'manage');
  const [activeTab, setActiveTab] = useState<'overview' | 'all-bookings'>('overview');

  // Fetch bookings metrics with trend data from statistics table
  const totalBookingsMetric = useAdminMetric({ metric: 'bookings_total', compareWith: 'last_month' });
  const completedBookingsMetric = useAdminMetric({ metric: 'bookings_completed', compareWith: 'last_month' });
  const pendingBookingsMetric = useAdminMetric({ metric: 'bookings_pending', compareWith: 'last_month' });
  const cancelledBookingsMetric = useAdminMetric({ metric: 'bookings_cancelled', compareWith: 'last_month' });
  const revenueMetric = useAdminMetric({ metric: 'bookings_revenue', compareWith: 'last_month' });
  const hoursMetric = useAdminMetric({ metric: 'bookings_hours_total', compareWith: 'last_month' });

  // Header actions - removed redundant Filters button (now in table toolbar)
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

  // Format hours
  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  // Mock data for charts (TODO: Replace with real API data)
  const [isLoadingCharts] = useState(false);

  // Booking trends data (last 7 days)
  const bookingTrendsData: TrendDataPoint[] = [
    { date: '2025-12-20', value: totalBookingsMetric.value * 0.12, label: '20 Dec' },
    { date: '2025-12-21', value: totalBookingsMetric.value * 0.14, label: '21 Dec' },
    { date: '2025-12-22', value: totalBookingsMetric.value * 0.15, label: '22 Dec' },
    { date: '2025-12-23', value: totalBookingsMetric.value * 0.13, label: '23 Dec' },
    { date: '2025-12-24', value: totalBookingsMetric.value * 0.16, label: '24 Dec' },
    { date: '2025-12-25', value: totalBookingsMetric.value * 0.14, label: '25 Dec' },
    { date: '2025-12-26', value: totalBookingsMetric.value * 0.16, label: '26 Dec' },
  ];

  // Booking status breakdown data
  const bookingStatusData: CategoryData[] = [
    { label: 'Completed', value: completedBookingsMetric.value, color: '#10B981' },
    { label: 'Pending', value: pendingBookingsMetric.value, color: '#F59E0B' },
    { label: 'Confirmed', value: Math.floor(totalBookingsMetric.value * 0.2), color: '#3B82F6' },
    { label: 'Cancelled', value: cancelledBookingsMetric.value, color: '#EF4444' },
  ];

  // Revenue trends data (last 7 days)
  const revenueTrendsData: TrendDataPoint[] = [
    { date: '2025-12-20', value: revenueMetric.value * 0.12, label: '20 Dec' },
    { date: '2025-12-21', value: revenueMetric.value * 0.14, label: '21 Dec' },
    { date: '2025-12-22', value: revenueMetric.value * 0.15, label: '22 Dec' },
    { date: '2025-12-23', value: revenueMetric.value * 0.13, label: '23 Dec' },
    { date: '2025-12-24', value: revenueMetric.value * 0.16, label: '24 Dec' },
    { date: '2025-12-25', value: revenueMetric.value * 0.14, label: '25 Dec' },
    { date: '2025-12-26', value: revenueMetric.value * 0.16, label: '26 Dec' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Bookings"
          subtitle="Manage platform bookings and revenue"
          actions={getHeaderActions()}
          className={styles.bookingsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-bookings', label: 'All Bookings', count: totalBookingsMetric.value, active: activeTab === 'all-bookings' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-bookings')}
          className={styles.bookingsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Booking Breakdown"
            stats={[
              { label: 'Total Bookings', value: totalBookingsMetric.value },
              { label: 'Completed', value: completedBookingsMetric.value },
              { label: 'Pending', value: pendingBookingsMetric.value },
              { label: 'Cancelled', value: cancelledBookingsMetric.value },
            ]}
          />
          <AdminHelpWidget
            title="Bookings Help"
            items={[
              { question: 'What is a booking?', answer: 'A booking is a scheduled tutoring session between a client and a tutor.' },
              { question: 'Why track completed bookings?', answer: 'Completed bookings represent successful sessions and generate platform revenue.' },
              { question: 'How to reduce cancellations?', answer: 'Improve matching quality, set clear expectations, and provide flexible rescheduling options.' },
            ]}
          />
          <AdminTipWidget
            title="Booking Tips"
            tips={[
              'Monitor completion rates for quality insights',
              'High cancellation rates may indicate issues',
              'Revenue trends show platform growth',
              'Track hours to understand platform usage',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards - Row 1: Booking Counts */}
          <HubKPIGrid>
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
              label="Completed"
              value={completedBookingsMetric.value}
              sublabel={formatMetricChange(
                completedBookingsMetric.change,
                completedBookingsMetric.changePercent,
                'last_month'
              )}
              icon={Calendar}
              trend={completedBookingsMetric.trend}
            />
            <HubKPICard
              label="Pending"
              value={pendingBookingsMetric.value}
              sublabel={formatMetricChange(
                pendingBookingsMetric.change,
                pendingBookingsMetric.changePercent,
                'last_month'
              )}
              icon={Calendar}
              trend={pendingBookingsMetric.trend}
            />
            <HubKPICard
              label="Cancelled"
              value={cancelledBookingsMetric.value}
              sublabel={formatMetricChange(
                cancelledBookingsMetric.change,
                cancelledBookingsMetric.changePercent,
                'last_month'
              )}
              icon={Calendar}
              trend={cancelledBookingsMetric.trend}
            />
          </HubKPIGrid>

          {/* KPI Cards - Row 2: Revenue & Hours */}
          <HubKPIGrid className={styles.secondRowGrid}>
            <HubKPICard
              label="Total Revenue"
              value={formatCurrency(revenueMetric.value)}
              sublabel={
                revenueMetric.change !== null
                  ? `${revenueMetric.change >= 0 ? '+' : ''}${formatCurrency(revenueMetric.change)} vs last month`
                  : undefined
              }
              icon={DollarSign}
              trend={revenueMetric.trend}
            />
            <HubKPICard
              label="Total Hours"
              value={formatHours(hoursMetric.value)}
              sublabel={
                hoursMetric.change !== null
                  ? `${hoursMetric.change >= 0 ? '+' : ''}${formatHours(hoursMetric.change)} vs last month`
                  : undefined
              }
              icon={Clock}
              trend={hoursMetric.trend}
            />
            <HubKPICard
              label="Avg. Revenue/Booking"
              value={
                completedBookingsMetric.value > 0
                  ? formatCurrency(revenueMetric.value / completedBookingsMetric.value)
                  : formatCurrency(0)
              }
              sublabel={
                completedBookingsMetric.previousValue && completedBookingsMetric.previousValue > 0
                  ? `${formatCurrency(revenueMetric.previousValue! / completedBookingsMetric.previousValue!)} last month`
                  : undefined
              }
              icon={DollarSign}
            />
            <HubKPICard
              label="Completion Rate"
              value={
                totalBookingsMetric.value > 0
                  ? `${Math.round((completedBookingsMetric.value / totalBookingsMetric.value) * 100)}%`
                  : '0%'
              }
              sublabel={
                totalBookingsMetric.previousValue && totalBookingsMetric.previousValue > 0
                  ? `${Math.round((completedBookingsMetric.previousValue! / totalBookingsMetric.previousValue!) * 100)}% last month`
                  : undefined
              }
              icon={Calendar}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* Booking Trends Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load booking trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={bookingTrendsData}
                  title="Booking Trends"
                  subtitle="Last 7 days"
                  valueName="Bookings"
                  lineColor="#3B82F6"
                />
              )}
            </ErrorBoundary>

            {/* Revenue Trends Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load revenue trends chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={revenueTrendsData}
                  title="Revenue Trends"
                  subtitle="Last 7 days"
                  valueName="Revenue"
                  lineColor="#10B981"
                  valueFormatter={(value) => `£${value}`}
                />
              )}
            </ErrorBoundary>

            {/* Booking Status Breakdown */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load status breakdown chart</div>}>
              {isLoadingCharts ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={bookingStatusData}
                  title="Booking Status Breakdown"
                  subtitle="Current distribution"
                />
              )}
            </ErrorBoundary>
          </div>

        </>
      )}

      {/* All Bookings Tab */}
      {activeTab === 'all-bookings' && (
        <BookingsTable />
      )}
    </HubPageLayout>
  );
}
