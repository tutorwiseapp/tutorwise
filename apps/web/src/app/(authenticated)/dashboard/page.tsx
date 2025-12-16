/*
 * Filename: src/app/(authenticated)/dashboard/page.tsx
 * Purpose: Dashboard hub page with role-specific navigation cards and aggregated stats
 * Change History:
 * C014 - 2025-12-08 : Added Analytics tab with Profile Views Trend and Referrer Sources charts
 * C013 - 2025-12-03 : Migrated to Hub Layout Architecture (HubPageLayout + HubHeader)
 * C012 - 2025-11-08 : 14:00 - Moved into (authenticated) folder, removed duplicate AppSidebar
 * C011 - 2025-11-08 : 12:00 - Transformed into unified hub with aggregated stats sidebar
 * C010 - 2025-09-01 : 19:00 - Replaced Kinde hook with useUserProfile to get full profile data.
 * C009 - 2025-08-26 : 19:00 - Converted from Server Component to Client Component.
 * Last Modified: 2025-12-08
 * Requirement ID: VIN-APP-01
 * Change Summary: Added Analytics tab with profile views tracking and referrer sources breakdown.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { PendingLogsWidget } from '@/app/components/feature/dashboard/PendingLogsWidget';
import KPIGrid, { KPIData } from '@/app/components/feature/dashboard/widgets/KPIGrid';
import EarningsTrendChart, { WeeklyEarnings } from '@/app/components/feature/dashboard/widgets/EarningsTrendChart';
import BookingCalendarHeatmap, { DayBooking } from '@/app/components/feature/dashboard/widgets/BookingCalendarHeatmap';
import ProfileGrowthWidget from '@/app/components/feature/dashboard/widgets/ProfileGrowthWidget';
import FirstLoginModal from '@/app/components/feature/dashboard/FirstLoginModal';
import TipsCard from '@/app/components/feature/dashboard/widgets/TipsCard';
import MessagesWidget from '@/app/components/feature/dashboard/widgets/MessagesWidget';
import PayoutWidget from '@/app/components/feature/dashboard/widgets/PayoutWidget';
import StudentTypeBreakdown, { StudentTypeData } from '@/app/components/feature/dashboard/widgets/StudentTypeBreakdown';
import ProfileViewsTrendChart, { DailyViews } from '@/app/components/feature/dashboard/widgets/ProfileViewsTrendChart';
import ReferrerSourcesChart, { ReferrerData } from '@/app/components/feature/dashboard/widgets/ReferrerSourcesChart';
import ReferralDashboardWidget from '@/app/components/feature/dashboard/widgets/ReferralDashboardWidget';
import { KPISkeleton, ChartSkeleton, WidgetSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

const DashboardPage = () => {
  const { profile, activeRole, isLoading, needsOnboarding } = useUserProfile();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);

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
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // React Query: Fetch Profile Views Trend data
  const {
    data: profileViewsTrendData = [],
    isLoading: isLoadingProfileViewsTrend,
  } = useQuery<DailyViews[]>({
    queryKey: ['dashboard', 'profile-views-trend', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/profile-views-trend?days=30');
      if (!response.ok) throw new Error('Failed to fetch profile views trend');
      return response.json();
    },
    enabled: activeTab === 'analytics',
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // React Query: Fetch Referrer Sources data
  const {
    data: referrerSourcesData = [],
    isLoading: isLoadingReferrerSources,
  } = useQuery<ReferrerData[]>({
    queryKey: ['dashboard', 'referrer-sources', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/referrer-sources');
      if (!response.ok) throw new Error('Failed to fetch referrer sources');
      return response.json();
    },
    enabled: activeTab === 'analytics',
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  // Check for first dashboard visit and show welcome modal
  useEffect(() => {
    async function checkFirstVisit() {
      if (!profile || isLoading) return;

      // Check if this is the first dashboard visit
      const preferences = profile.preferences as any;
      const hasSeenDashboardWelcome = preferences?.dashboard_welcome_seen;

      if (!hasSeenDashboardWelcome && (profile as any).onboarding_completed) {
        // Show modal after a short delay for better UX
        setTimeout(() => {
          setShowFirstLoginModal(true);
        }, 500);
      }
    }

    checkFirstVisit();
  }, [profile, isLoading]);

  // Handle first login modal close - mark as seen
  const handleFirstLoginModalClose = async () => {
    setShowFirstLoginModal(false);

    if (!profile) return;

    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      // Update preferences to mark dashboard welcome as seen
      const currentPreferences = (profile.preferences as any) || {};
      const updatedPreferences = {
        ...currentPreferences,
        dashboard_welcome_seen: true,
        dashboard_welcome_seen_at: new Date().toISOString(),
      };

      await supabase
        .from('profiles')
        .update({ preferences: updatedPreferences })
        .eq('id', profile.id);

      console.log('[Dashboard] First login modal dismissed and marked as seen');
    } catch (error) {
      console.error('[Dashboard] Error marking first login modal as seen:', error);
    }
  };

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
    return (
      <div className={styles.headerActions}>
        {/* Primary Action Button */}
        {activeRole === 'tutor' && (
          <Link href="/create-listing">
            <Button variant="primary" size="sm">Create Listing</Button>
          </Link>
        )}

        {activeRole === 'agent' && (
          <Link href="/create-listing">
            <Button variant="primary" size="sm">Create Listing</Button>
          </Link>
        )}

        {activeRole === 'client' && (
          <Link href="/marketplace">
            <Button variant="primary" size="sm">Find Tutors</Button>
          </Link>
        )}

        {/* Secondary Actions: Dropdown Menu */}
        <div className={actionStyles.dropdownContainer}>
          <Button
            variant="secondary"
            size="sm"
            square
            onClick={() => setShowActionsMenu(!showActionsMenu)}
          >
            ⋮
          </Button>

          {showActionsMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className={actionStyles.backdrop}
                onClick={() => setShowActionsMenu(false)}
              />

              {/* Dropdown Menu */}
              <div className={actionStyles.dropdownMenu}>
                <button
                  onClick={() => {
                    router.push('/account/personal-info');
                    setShowActionsMenu(false);
                  }}
                  className={actionStyles.menuButton}
                >
                  View Profile
                </button>
                <button
                  onClick={() => {
                    router.push('/settings');
                    setShowActionsMenu(false);
                  }}
                  className={actionStyles.menuButton}
                >
                  Settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* First Login Welcome Modal - Track B Phase 1.2 */}
      <FirstLoginModal
        isOpen={showFirstLoginModal}
        onClose={handleFirstLoginModalClose}
        userName={firstName}
        role={(activeRole === 'student' ? 'client' : activeRole) as 'tutor' | 'client' | 'agent' || 'tutor'}
        currentScore={profile.caas_score || 0}
      />

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
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'analytics', label: 'Analytics', active: activeTab === 'analytics' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'analytics')}
        />
      }
      sidebar={
        <HubSidebar>
          {/* Profile Growth Widget - Unified CaaS Score + Getting Started */}
          <ProfileGrowthWidget
            userId={profile.id}
            role={activeRole === 'client' ? 'client' : activeRole === 'agent' ? 'agent' : 'tutor'}
          />

          {/* Tips Card - Role-specific actionable tips */}
          <TipsCard
            role={activeRole === 'client' ? 'client' : activeRole === 'agent' ? 'agent' : 'tutor'}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
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
        {/* Referral Dashboard Widget - for agents only */}
        {activeRole === 'agent' && profile.referral_code && (
          <ErrorBoundary>
            <ReferralDashboardWidget
              agentId={profile.id}
              referralCode={profile.referral_code}
            />
          </ErrorBoundary>
        )}

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
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
          {/* Analytics Charts Section */}
          <div className={styles.chartsSection}>
            {/* Profile Views Trend Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load profile views trend</div>}>
              {isLoadingProfileViewsTrend ? (
                <ChartSkeleton height="320px" />
              ) : (
                <ProfileViewsTrendChart
                  data={profileViewsTrendData}
                  days={30}
                />
              )}
            </ErrorBoundary>

            {/* Referrer Sources Chart */}
            <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load referrer sources</div>}>
              {isLoadingReferrerSources ? (
                <ChartSkeleton height="350px" />
              ) : (
                <ReferrerSourcesChart
                  data={referrerSourcesData}
                  defaultView="pie"
                />
              )}
            </ErrorBoundary>
          </div>
        </>
      )}
    </HubPageLayout>
    </>
  );
};

export default DashboardPage;