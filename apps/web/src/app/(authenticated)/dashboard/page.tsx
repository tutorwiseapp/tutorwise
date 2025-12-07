/*
 * Filename: src/app/(authenticated)/dashboard/page.tsx
 * Purpose: Dashboard hub page with role-specific navigation cards and aggregated stats
 * Change History:
 * C013 - 2025-12-03 : Migrated to Hub Layout Architecture (HubPageLayout + HubHeader)
 * C012 - 2025-11-08 : 14:00 - Moved into (authenticated) folder, removed duplicate AppSidebar
 * C011 - 2025-11-08 : 12:00 - Transformed into unified hub with aggregated stats sidebar
 * C010 - 2025-09-01 : 19:00 - Replaced Kinde hook with useUserProfile to get full profile data.
 * C009 - 2025-08-26 : 19:00 - Converted from Server Component to Client Component.
 * Last Modified: 2025-12-03
 * Requirement ID: VIN-APP-01
 * Change Summary: Migrated to use HubPageLayout and HubHeader for consistent UX. Dashboard-specific grid layout preserved.
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { PendingLogsWidget } from '@/app/components/feature/dashboard/PendingLogsWidget';
import KPIGrid, { KPIData } from '@/app/components/feature/dashboard/widgets/KPIGrid';
import EarningsTrendChart, { WeeklyEarnings } from '@/app/components/feature/dashboard/widgets/EarningsTrendChart';
import BookingCalendarHeatmap, { DayBooking } from '@/app/components/feature/dashboard/widgets/BookingCalendarHeatmap';
import HelpCard from '@/app/components/feature/dashboard/widgets/HelpCard';
import TipsCard from '@/app/components/feature/dashboard/widgets/TipsCard';
import MessagesWidget from '@/app/components/feature/dashboard/widgets/MessagesWidget';
import PayoutWidget from '@/app/components/feature/dashboard/widgets/PayoutWidget';
import StudentTypeBreakdown, { StudentTypeData } from '@/app/components/feature/dashboard/widgets/StudentTypeBreakdown';
import { KPISkeleton, ChartSkeleton, WidgetSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import styles from './page.module.css';

const DashboardPage = () => {
  const { profile, activeRole, isLoading, needsOnboarding } = useUserProfile();
  const router = useRouter();

  // React Query: Fetch KPI data with automatic retry, caching, and background refetch
  const {
    data: kpiData = null,
    isLoading: isLoadingKPIs,
  } = useQuery({
    queryKey: ['dashboard', 'kpis', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/kpis');
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      return response.json();
    },
    enabled: !!profile && !isLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // React Query: Fetch Earnings Trend data
  const {
    data: earningsTrendData = [],
    isLoading: isLoadingEarnings,
  } = useQuery<WeeklyEarnings[]>({
    queryKey: ['dashboard', 'earnings-trend', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/earnings-trend?weeks=6');
      if (!response.ok) throw new Error('Failed to fetch earnings trend');
      return response.json();
    },
    enabled: !!profile && !isLoading,
    staleTime: 3 * 60 * 1000, // 3 minutes (less frequently changing)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // React Query: Fetch Booking Heatmap data
  const {
    data: bookingHeatmapData = [],
    isLoading: isLoadingHeatmap,
  } = useQuery<DayBooking[]>({
    queryKey: ['dashboard', 'booking-heatmap', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/booking-heatmap?days=14');
      if (!response.ok) throw new Error('Failed to fetch booking heatmap');
      return response.json();
    },
    enabled: !!profile && !isLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // React Query: Fetch Student Breakdown data
  const {
    data: studentBreakdownData = { new: 0, returning: 0 },
    isLoading: isLoadingStudentBreakdown,
  } = useQuery<StudentTypeData>({
    queryKey: ['dashboard', 'student-breakdown', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/student-breakdown');
      if (!response.ok) throw new Error('Failed to fetch student breakdown');
      return response.json();
    },
    enabled: !!profile && !isLoading,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    // If loading is finished and there's no profile, the user is not logged in.
    if (!isLoading && !profile) {
      router.push('/login');
      return;
    }

    // Strict enforcement: redirect to onboarding if not completed
    if (!isLoading && profile && needsOnboarding) {
      console.log('Redirecting to onboarding - dashboard access blocked until completion');
      router.push('/onboarding');
      return;
    }
  }, [isLoading, profile, needsOnboarding, router]);

  // Show loading while checking authentication and onboarding status
  if (isLoading || !profile || needsOnboarding) {
    return (
      <HubPageLayout
        header={<HubHeader title="Dashboard" />}
      >
        <p className={styles.loading}>Loading...</p>
      </HubPageLayout>
    );
  }

  const displayName = profile.full_name || 'User';
  const firstName = displayName.split(' ')[0];

  // Get role-specific dashboard title
  const getDashboardTitle = () => {
    switch (activeRole) {
      case 'client': return 'My Learning Hub';
      case 'tutor': return 'My Teaching Studio';
      case 'agent': return 'My Tutoring Agency';
      default: return 'Dashboard';
    }
  };

  // Get formatted role name
  const getFormattedRole = () => {
    switch (activeRole) {
      case 'client': return 'Client';
      case 'tutor': return 'Tutor';
      case 'agent': return 'Agent';
      default: return '';
    }
  };

  // Role-specific action buttons for header
  const getHeaderActions = () => {
    const actions = [];

    if (activeRole === 'tutor') {
      actions.push(
        <Link key="create-listing" href="/create-listing">
          <button className={`${styles.actionButton} ${styles.tutorPrimary}`}>Create Listing</button>
        </Link>
      );
    }

    if (activeRole === 'agent') {
      actions.push(
        <Link key="create-listing" href="/create-listing">
          <button className={`${styles.actionButton} ${styles.agentPrimary}`}>Create Listing</button>
        </Link>
      );
    }

    if (activeRole === 'client') {
      actions.push(
        <Link key="find-tutors" href="/marketplace">
          <button className={`${styles.actionButton} ${styles.clientPrimary}`}>Find Tutors</button>
        </Link>
      );
    }

    actions.push(
      <Link key="profile" href="/account/personal-info">
        <button className={styles.actionButtonSecondary}>View Profile</button>
      </Link>,
      <Link key="settings" href="/settings">
        <button className={styles.actionButtonSecondary}>Settings</button>
      </Link>
    );

    return <div className={styles.headerActions}>{actions}</div>;
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title={getDashboardTitle()}
          subtitle={`Welcome, ${firstName} (${getFormattedRole()})`}
          actions={getHeaderActions()}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: true }
          ]}
          onTabChange={() => {}}  // Single tab, no switching needed
        />
      }
      sidebar={
        <HubSidebar>
          {/* Help Card - Role-specific next steps */}
          <HelpCard
            role={activeRole === 'client' ? 'client' : activeRole === 'agent' ? 'agent' : 'tutor'}
            profileCompleteness={75} // TODO: Calculate from profile data
            hasListings={false} // TODO: Get from API
            hasBookings={kpiData ? (kpiData.completedSessionsThisMonth > 0 || kpiData.upcomingSessions > 0) : false}
          />

          {/* Tips Card - Role-specific actionable tips */}
          <TipsCard
            role={activeRole === 'client' ? 'client' : activeRole === 'agent' ? 'agent' : 'tutor'}
          />
        </HubSidebar>
      }
    >
      {/* KPI Grid */}
      {isLoadingKPIs ? (
        <KPISkeleton count={4} />
      ) : kpiData ? (
        <KPIGrid
          data={kpiData}
          role={activeRole === 'client' ? 'client' : activeRole === 'agent' ? 'agent' : 'tutor'}
          currency="GBP"
        />
      ) : null}

      {/* Charts Section */}
      <div className={styles.chartsSection}>
        {/* Earnings Trend Chart (for tutors/agents and clients spending) */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load earnings chart</div>}>
          {isLoadingEarnings ? (
            <ChartSkeleton height="320px" />
          ) : earningsTrendData.length > 0 ? (
            <EarningsTrendChart
              data={earningsTrendData}
              currency="GBP"
              showComparison={false}
            />
          ) : null}
        </ErrorBoundary>

        {/* Booking Calendar Heatmap */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load booking calendar</div>}>
          {isLoadingHeatmap ? (
            <ChartSkeleton height="400px" />
          ) : (
            <BookingCalendarHeatmap
              data={bookingHeatmapData}
              range="next-14-days"
            />
          )}
        </ErrorBoundary>

        {/* Student Type Breakdown (pie/bar chart) */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load student breakdown</div>}>
          {isLoadingStudentBreakdown ? (
            <ChartSkeleton height="350px" />
          ) : (
            <StudentTypeBreakdown
              data={studentBreakdownData}
              defaultView="pie"
            />
          )}
        </ErrorBoundary>
      </div>

      {/* Actionable Widgets Section */}
      <div className={styles.actionableWidgets}>
        {/* Pending Actions for tutors/agents */}
        {(activeRole === 'tutor' || activeRole === 'agent') && (
          <ErrorBoundary>
            <PendingLogsWidget />
          </ErrorBoundary>
        )}

        {/* Messages Widget - for all roles */}
        <ErrorBoundary>
          <MessagesWidget
            unreadCount={0} // TODO: Get from API
            recentMessages={[]} // TODO: Get from API
          />
        </ErrorBoundary>

        {/* Payout Widget - for tutors/agents only */}
        {(activeRole === 'tutor' || activeRole === 'agent') && (
          <ErrorBoundary>
            <PayoutWidget
              nextPayoutDate={undefined} // TODO: Get from API
              nextPayoutAmount={0} // TODO: Get from API
              pendingBalance={0} // TODO: Get from API
              currency="GBP"
            />
          </ErrorBoundary>
        )}
      </div>
    </HubPageLayout>
  );
};

export default DashboardPage;