/*
 * Filename: src/app/(admin)/admin/accounts/users/page.tsx
 * Purpose: Admin Users page - Overview and management
 * Created: 2025-12-28
 * Phase: 2 - Platform Management
 */
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { Users, UserCog, Shield } from 'lucide-react';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type TrendDataPoint, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import UsersTable from './components/UsersTable';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminUsersOverviewPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'all-users'>('overview');

  // Fetch user metrics with trend data from statistics table
  const totalUsersMetric = useAdminMetric({ metric: 'total_users', compareWith: 'last_month' });
  const activeUsersMetric = useAdminMetric({ metric: 'active_users', compareWith: 'last_month' });
  const adminUsersMetric = useAdminMetric({ metric: 'admin_users', compareWith: 'last_month' });
  const pendingOnboardingMetric = useAdminMetric({ metric: 'pending_onboarding_users', compareWith: 'last_month' });

  // Fetch real user data for charts
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users-data'],
    queryFn: async () => {
      const supabase = createClient();

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, created_at, active_role, profile_completed, is_admin, identity_verified');

      if (error) throw error;

      return profiles || [];
    },
    staleTime: 60 * 1000,
  });

  // Calculate user type counts directly from data
  const tutorsCount = usersData?.filter(u => u.active_role === 'tutor' && !u.is_admin).length || 0;
  const clientsCount = usersData?.filter(u => u.active_role === 'client' && !u.is_admin).length || 0;
  const verifiedCount = usersData?.filter(u => u.identity_verified).length || 0;

  // Calculate new users this month
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const newUsersThisMonth = usersData?.filter(u => new Date(u.created_at) >= thisMonthStart).length || 0;

  // Fetch chart data - User Growth Trend (last 7 days)
  const { data: userGrowthData, isLoading: isLoadingGrowth } = useQuery<TrendDataPoint[]>({
    queryKey: ['admin-users-growth-trend'],
    queryFn: async () => {
      const trendPoints: TrendDataPoint[] = [];

      try {
        const supabase = createClient();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by date
        const groupedByDate: Record<string, number> = {};
        data?.forEach(profile => {
          const date = new Date(profile.created_at).toISOString().split('T')[0];
          groupedByDate[date] = (groupedByDate[date] || 0) + 1;
        });

        // Create trend data for last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

          trendPoints.push({
            label,
            value: groupedByDate[dateStr] || 0,
          });
        }
      } catch (error) {
        // On error, still return 7 days with zero values
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

          trendPoints.push({
            label,
            value: 0,
          });
        }
      }

      return trendPoints;
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  // Fetch chart data - User Type Breakdown
  const { data: userTypeData, isLoading: isLoadingUserTypes } = useQuery<CategoryData[]>({
    queryKey: ['admin-users-type-breakdown'],
    queryFn: async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('profiles')
          .select('active_role');

        if (error) throw error;

        const tutors = data?.filter(p => p.active_role === 'provider').length || 0;
        const clients = data?.filter(p => p.active_role === 'seeker').length || 0;
        const agents = data?.filter(p => p.active_role === 'agent').length || 0;
        const unset = data?.filter(p => !p.active_role).length || 0;

        return [
          { label: 'Tutors', value: tutors, color: '#3B82F6' },
          { label: 'Clients', value: clients, color: '#10B981' },
          { label: 'Agents', value: agents, color: '#F59E0B' },
          { label: 'Not Set', value: unset, color: '#9CA3AF' },
        ];
      } catch (error) {
        // On error, still return structure with zero values
        return [
          { label: 'Tutors', value: 0, color: '#3B82F6' },
          { label: 'Clients', value: 0, color: '#10B981' },
          { label: 'Agents', value: 0, color: '#F59E0B' },
          { label: 'Not Set', value: 0, color: '#9CA3AF' },
        ];
      }
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  // Fetch chart data - Onboarding Status Breakdown
  const { data: onboardingStatusData, isLoading: isLoadingOnboarding } = useQuery<CategoryData[]>({
    queryKey: ['admin-users-onboarding-status'],
    queryFn: async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('profiles')
          .select('profile_completed, identity_verified');

        if (error) throw error;

        const completed = data?.filter(p => p.profile_completed).length || 0;
        const pending = data?.filter(p => !p.profile_completed).length || 0;
        const verified = data?.filter(p => p.identity_verified).length || 0;
        const unverified = data?.filter(p => !p.identity_verified).length || 0;

        return [
          { label: 'Completed', value: completed, color: '#10B981' },
          { label: 'Pending', value: pending, color: '#F59E0B' },
          { label: 'Verified', value: verified, color: '#3B82F6' },
          { label: 'Unverified', value: unverified, color: '#EF4444' },
        ];
      } catch (error) {
        // On error, still return structure with zero values
        return [
          { label: 'Completed', value: 0, color: '#10B981' },
          { label: 'Pending', value: 0, color: '#F59E0B' },
          { label: 'Verified', value: 0, color: '#3B82F6' },
          { label: 'Unverified', value: 0, color: '#EF4444' },
        ];
      }
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  const isLoadingCharts = isLoadingGrowth || isLoadingUserTypes || isLoadingOnboarding;

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Users"
          subtitle="Manage platform users and accounts"
          className={styles.usersHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-users', label: 'All Users', count: totalUsersMetric.value, active: activeTab === 'all-users' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-users')}
          className={styles.usersTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="User Overview"
            stats={[
              { label: 'Total Users', value: totalUsersMetric.value },
              { label: 'Active Users', value: activeUsersMetric.value },
              { label: 'Admin Users', value: adminUsersMetric.value },
              { label: 'Pending Onboarding', value: pendingOnboardingMetric.value },
            ]}
          />
          <AdminHelpWidget
            title="User Management Help"
            items={[
              { question: 'What is User Management?', answer: 'Control user accounts, permissions, and administrative access across the platform.' },
              { question: 'How do I manage admins?', answer: 'Click "Manage Admins" to grant, revoke, or change admin roles and permissions.' },
              { question: 'What roles are available?', answer: 'Superadmin, Admin, System Admin, and Support Admin with different permission levels.' },
            ]}
          />
          <AdminTipWidget
            title="User Tips"
            tips={[
              'Review admin permissions regularly',
              'Monitor user onboarding completion',
              'Track active vs inactive users',
              'Audit admin activity logs',
            ]}
          />
        </HubSidebar>
      }
    >

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards - 8 total to match Bookings */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Users"
              value={totalUsersMetric.value}
              sublabel={formatMetricChange(totalUsersMetric.change, totalUsersMetric.changePercent, 'last_month')}
              icon={Users}
              trend={totalUsersMetric.trend}
            />
            <HubKPICard
              label="Active Users"
              value={activeUsersMetric.value}
              sublabel={formatMetricChange(activeUsersMetric.change, activeUsersMetric.changePercent, 'last_month')}
              icon={UserCog}
              trend={activeUsersMetric.trend}
            />
            <HubKPICard
              label="Tutors"
              value={tutorsCount}
              sublabel="total tutors"
              icon={Users}
            />
            <HubKPICard
              label="Clients"
              value={clientsCount}
              sublabel="total clients"
              icon={Users}
            />
            <HubKPICard
              label="New This Month"
              value={newUsersThisMonth}
              sublabel="new signups"
              icon={Users}
            />
            <HubKPICard
              label="Verified Users"
              value={verifiedCount}
              sublabel="email verified"
              icon={Shield}
            />
            <HubKPICard
              label="Pending Onboarding"
              value={pendingOnboardingMetric.value}
              sublabel={formatMetricChange(pendingOnboardingMetric.change, pendingOnboardingMetric.changePercent, 'last_month') || 'Awaiting completion'}
              icon={Users}
              trend={pendingOnboardingMetric.trend}
            />
            <HubKPICard
              label="Admin Users"
              value={adminUsersMetric.value}
              sublabel={formatMetricChange(adminUsersMetric.change, adminUsersMetric.changePercent, 'last_month')}
              icon={Shield}
              trend={adminUsersMetric.trend}
            />
          </HubKPIGrid>

          {/* Charts Section */}
          <div className={styles.chartsSection}>
            {/* User Growth Trend Chart */}
            <ErrorBoundary
              fallback={
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  Unable to load user growth chart
                </div>
              }
            >
              {isLoadingCharts || !userGrowthData ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubTrendChart
                  data={userGrowthData}
                  title="User Growth"
                  subtitle="Last 7 days"
                  valueName="New Users"
                  lineColor="#3B82F6"
                />
              )}
            </ErrorBoundary>

            {/* User Type Breakdown Chart */}
            <ErrorBoundary
              fallback={
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  Unable to load user type breakdown chart
                </div>
              }
            >
              {isLoadingCharts || !userTypeData ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={userTypeData}
                  title="User Type Distribution"
                  subtitle="Current breakdown"
                />
              )}
            </ErrorBoundary>

            {/* Onboarding Status Breakdown Chart */}
            <ErrorBoundary
              fallback={
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  Unable to load onboarding status chart
                </div>
              }
            >
              {isLoadingCharts || !onboardingStatusData ? (
                <ChartSkeleton height="320px" />
              ) : (
                <HubCategoryBreakdownChart
                  data={onboardingStatusData}
                  title="Onboarding & Verification Status"
                  subtitle="Current breakdown"
                />
              )}
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* All Users Tab */}
      {activeTab === 'all-users' && (
        <div className={styles.allUsersContainer}>
          <UsersTable />
        </div>
      )}
    </HubPageLayout>
  );
}
