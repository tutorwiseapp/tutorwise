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
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminBookingsOverviewPage() {
  const router = useRouter();
  const canViewBookings = usePermission('bookings', 'view');
  const canManageBookings = usePermission('bookings', 'manage');
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  // Fetch bookings metrics with trend data from statistics table
  const totalBookingsMetric = useAdminMetric({ metric: 'bookings_total', compareWith: 'last_month' });
  const completedBookingsMetric = useAdminMetric({ metric: 'bookings_completed', compareWith: 'last_month' });
  const pendingBookingsMetric = useAdminMetric({ metric: 'bookings_pending', compareWith: 'last_month' });
  const cancelledBookingsMetric = useAdminMetric({ metric: 'bookings_cancelled', compareWith: 'last_month' });
  const revenueMetric = useAdminMetric({ metric: 'bookings_revenue', compareWith: 'last_month' });
  const hoursMetric = useAdminMetric({ metric: 'bookings_hours_total', compareWith: 'last_month' });

  // Header actions
  const getHeaderActions = () => {
    if (!canManageBookings.hasAccess) return undefined;

    return (
      <div className={styles.headerActions}>
        <Button variant="secondary" size="sm">
          <Filter className={styles.buttonIcon} />
          Filters
        </Button>
      </div>
    );
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
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview')}
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

          {/* Coming Soon Placeholder */}
          <div className={styles.placeholder}>
            <Calendar className={styles.placeholderIcon} />
            <h3 className={styles.placeholderTitle}>Bookings Management Coming Soon</h3>
            <p className={styles.placeholderText}>
              Detailed booking analytics, revenue reports, and management tools will be available here.
            </p>
          </div>
        </>
      )}
    </HubPageLayout>
  );
}
