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

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import styles from './page.module.css';

const DashboardPage = () => {
  const { profile, activeRole, isLoading, needsOnboarding } = useUserProfile();
  const router = useRouter();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [earningsTrendData, setEarningsTrendData] = useState<WeeklyEarnings[]>([]);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
  const [bookingHeatmapData, setBookingHeatmapData] = useState<DayBooking[]>([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(true);
  const [studentBreakdownData, setStudentBreakdownData] = useState<StudentTypeData>({ new: 0, returning: 0 });
  const [isLoadingStudentBreakdown, setIsLoadingStudentBreakdown] = useState(true);

  // Fetch KPI data
  useEffect(() => {
    if (!profile) return;

    const fetchKPIs = async () => {
      try {
        const response = await fetch('/api/dashboard/kpis');
        if (!response.ok) throw new Error('Failed to fetch KPIs');
        const data = await response.json();
        setKpiData(data);
      } catch (error) {
        console.error('[Dashboard] Error fetching KPIs:', error);
      } finally {
        setIsLoadingKPIs(false);
      }
    };

    fetchKPIs();
  }, [profile]);

  // Fetch Earnings Trend data
  useEffect(() => {
    if (!profile) return;

    const fetchEarningsTrend = async () => {
      try {
        const response = await fetch('/api/dashboard/earnings-trend?weeks=6');
        if (!response.ok) throw new Error('Failed to fetch earnings trend');
        const data = await response.json();
        setEarningsTrendData(data);
      } catch (error) {
        console.error('[Dashboard] Error fetching earnings trend:', error);
      } finally {
        setIsLoadingEarnings(false);
      }
    };

    fetchEarningsTrend();
  }, [profile]);

  // Fetch Booking Heatmap data
  useEffect(() => {
    if (!profile) return;

    const fetchBookingHeatmap = async () => {
      try {
        const response = await fetch('/api/dashboard/booking-heatmap?days=14');
        if (!response.ok) throw new Error('Failed to fetch booking heatmap');
        const data = await response.json();
        setBookingHeatmapData(data);
      } catch (error) {
        console.error('[Dashboard] Error fetching booking heatmap:', error);
      } finally {
        setIsLoadingHeatmap(false);
      }
    };

    fetchBookingHeatmap();
  }, [profile]);

  // Fetch Student Breakdown data
  useEffect(() => {
    if (!profile) return;

    const fetchStudentBreakdown = async () => {
      try {
        const response = await fetch('/api/dashboard/student-breakdown');
        if (!response.ok) throw new Error('Failed to fetch student breakdown');
        const data = await response.json();
        setStudentBreakdownData(data);
      } catch (error) {
        console.error('[Dashboard] Error fetching student breakdown:', error);
      } finally {
        setIsLoadingStudentBreakdown(false);
      }
    };

    fetchStudentBreakdown();
  }, [profile]);

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
        <p className={styles.loading}>Loading dashboard metrics...</p>
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
        {!isLoadingEarnings && earningsTrendData.length > 0 && (
          <EarningsTrendChart
            data={earningsTrendData}
            currency="GBP"
            showComparison={false}
          />
        )}

        {/* Booking Calendar Heatmap */}
        {!isLoadingHeatmap && (
          <BookingCalendarHeatmap
            data={bookingHeatmapData}
            range="next-14-days"
          />
        )}

        {/* Student Type Breakdown (pie/bar chart) */}
        {!isLoadingStudentBreakdown && (
          <StudentTypeBreakdown
            data={studentBreakdownData}
            defaultView="pie"
          />
        )}
      </div>

      {/* Actionable Widgets Section */}
      <div className={styles.actionableWidgets}>
        {/* Pending Actions for tutors/agents */}
        {(activeRole === 'tutor' || activeRole === 'agent') && <PendingLogsWidget />}

        {/* Messages Widget - for all roles */}
        <MessagesWidget
          unreadCount={0} // TODO: Get from API
          recentMessages={[]} // TODO: Get from API
        />

        {/* Payout Widget - for tutors/agents only */}
        {(activeRole === 'tutor' || activeRole === 'agent') && (
          <PayoutWidget
            nextPayoutDate={undefined} // TODO: Get from API
            nextPayoutAmount={0} // TODO: Get from API
            pendingBalance={0} // TODO: Get from API
            currency="GBP"
          />
        )}
      </div>
    </HubPageLayout>
  );
};

export default DashboardPage;