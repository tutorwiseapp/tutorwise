/*
 * Filename: src/app/(authenticated)/dashboard/page.tsx
 * Purpose: Dashboard hub page with role-specific navigation cards and aggregated stats
 * Change History:
 * C015 - 2025-12-18 : Removed Analytics tab (Profile Views/Referrer Sources moved to future Hub charts)
 * C014 - 2025-12-08 : Added Analytics tab with Profile Views Trend and Referrer Sources charts
 * C013 - 2025-12-03 : Migrated to Hub Layout Architecture (HubPageLayout + HubHeader)
 * C012 - 2025-11-08 : 14:00 - Moved into (authenticated) folder, removed duplicate AppSidebar
 * C011 - 2025-11-08 : 12:00 - Transformed into unified hub with aggregated stats sidebar
 * C010 - 2025-09-01 : 19:00 - Replaced Kinde hook with useUserProfile to get full profile data.
 * C009 - 2025-08-26 : 19:00 - Converted from Server Component to Client Component.
 * Last Modified: 2025-12-18
 * Requirement ID: VIN-APP-01
 * Change Summary: Removed Analytics tab - functionality can be rebuilt via Hub charts when needed.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAdminProfile } from '@/lib/rbac';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { PendingLogsWidget } from '@/app/components/feature/dashboard/content/PendingLogsWidget';
import KPIGrid from '@/app/components/feature/dashboard/performance/KPIGrid';
import { HubEarningsTrendChart, HubCalendarHeatmap, type WeeklyEarnings, type DayData } from '@/app/components/hub/charts';
import ProfileGrowthWidget from '@/app/components/feature/dashboard/performance/ProfileGrowthWidget';
import FirstLoginModal from '@/app/components/feature/dashboard/content/FirstLoginModal';
import TipsCard from '@/app/components/feature/dashboard/performance/TipsCard';
import DashboardHelpWidget from '@/app/components/feature/dashboard/sidebar/DashboardHelpWidget';
import DashboardVideoWidget from '@/app/components/feature/dashboard/sidebar/DashboardVideoWidget';
import { TooltipProvider } from '@/app/components/ui/Tooltip';
import MessagesWidget from '@/app/components/feature/dashboard/performance/MessagesWidget';
import PayoutWidget from '@/app/components/feature/dashboard/performance/PayoutWidget';
import { HubStudentTypeBreakdown, type StudentTypeData } from '@/app/components/hub/charts';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

const DashboardPage = () => {
  const { profile, activeRole, isLoading, needsOnboarding } = useUserProfile();
  const { profile: adminProfile } = useAdminProfile();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview'>('overview');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);

  // Phase 1.4 COMPLETE: KPI data now fetched via useUserMetric hooks in KPIGrid component
  // Old API endpoint /api/dashboard/kpis can be deprecated after testing

  // React Query: Fetch Earnings Trend data
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: earningsTrendData = [],
    isLoading: isLoadingEarnings,
    isFetching: _isFetchingEarnings,
  } = useQuery<WeeklyEarnings[]>({
    queryKey: ['dashboard', 'earnings-trend', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/earnings-trend?weeks=6');
      if (!response.ok) throw new Error('Failed to fetch earnings trend');
      return response.json();
    },
    enabled: !!profile?.id, // Wait for profile to load before fetching
    placeholderData: keepPreviousData,
    staleTime: 3 * 60 * 1000, // 3 minutes (less frequently changing)
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts (page is clicked)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // React Query: Fetch Booking Heatmap data
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: bookingHeatmapData = [],
    isLoading: isLoadingHeatmap,
    isFetching: _isFetchingHeatmap,
  } = useQuery<DayData[]>({
    queryKey: ['dashboard', 'booking-heatmap', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/booking-heatmap?days=14');
      if (!response.ok) throw new Error('Failed to fetch booking heatmap');
      return response.json();
    },
    enabled: !!profile?.id, // Wait for profile to load before fetching
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts (page is clicked)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // React Query: Fetch Student Breakdown data
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: studentBreakdownData = { new: 0, returning: 0 },
    isLoading: isLoadingStudentBreakdown,
    isFetching: _isFetchingStudentBreakdown,
  } = useQuery<StudentTypeData>({
    queryKey: ['dashboard', 'student-breakdown', profile?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/student-breakdown');
      if (!response.ok) throw new Error('Failed to fetch student breakdown');
      return response.json();
    },
    enabled: !!profile?.id, // Wait for profile to load before fetching
    placeholderData: keepPreviousData,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts (page is clicked)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
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

  // Get formatted role name (show both regular role and admin role if applicable)
  const getFormattedRole = () => {
    let regularRole = '';
    switch (activeRole) {
      case 'client': regularRole = 'Client'; break;
      case 'tutor': regularRole = 'Tutor'; break;
      case 'agent': regularRole = 'Agent'; break;
      case 'admin': regularRole = ''; break; // Don't show 'Admin' as regular role
      default: regularRole = '';
    }

    // Get admin role if user is admin
    let adminRoleName = '';
    if (adminProfile?.admin_role) {
      switch (adminProfile.admin_role) {
        case 'superadmin': adminRoleName = 'Superadmin'; break;
        case 'admin': adminRoleName = 'Admin'; break;
        case 'systemadmin': adminRoleName = 'System Admin'; break;
        case 'supportadmin': adminRoleName = 'Support Admin'; break;
      }
    }

    // Combine roles with bullet separator
    if (regularRole && adminRoleName) {
      return `${regularRole} • ${adminRoleName}`;
    } else if (adminRoleName) {
      return adminRoleName;
    } else {
      return regularRole;
    }
  };

  // Role-specific action buttons for header
  const getHeaderActions = () => {
    return (
      <div className={styles.headerActions}>
        {/* Primary Action Button */}
        {activeRole === 'tutor' && (
          <Link href="/listings/create/one-to-one">
            <Button variant="primary" size="sm">Create Listing</Button>
          </Link>
        )}

        {activeRole === 'agent' && (
          <Link href="/listings/create/one-to-one">
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
    <TooltipProvider>
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
            className={styles.dashboardHeader}
          />
        }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview')}
          className={styles.dashboardTabs}
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

          {/* Help Widget */}
          <DashboardHelpWidget
            role={activeRole === 'client' ? 'client' : activeRole === 'agent' ? 'agent' : 'tutor'}
            caasScore={profile.caas_score || 0}
            profileComplete={!!profile?.onboarding_progress?.onboarding_completed}
          />

          {/* Video Widget */}
          <DashboardVideoWidget />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Grid - Migrated to useUserMetric hook (Phase 1.4) */}
          <KPIGrid
            userId={profile.id}
            role={activeRole === 'client' ? 'client' : activeRole === 'agent' ? 'agent' : 'tutor'}
            currency="GBP"
          />

      {/* Charts Section */}
      <div className={styles.chartsSection}>
        {/* Earnings Trend Chart (for tutors/agents and clients spending) */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load earnings chart</div>}>
          {isLoadingEarnings ? (
            <ChartSkeleton height="320px" />
          ) : (
            <HubEarningsTrendChart
              data={earningsTrendData}
              currency="GBP"
              showComparison={false}
            />
          )}
        </ErrorBoundary>

        {/* Booking Calendar Heatmap */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load booking calendar</div>}>
          {isLoadingHeatmap ? (
            <ChartSkeleton height="400px" />
          ) : (
            <HubCalendarHeatmap
              data={bookingHeatmapData}
              range="next-14-days"
              title="Booking Calendar"
              subtitle="Next 14 days"
            />
          )}
        </ErrorBoundary>

        {/* Student Type Breakdown (pie/bar chart) */}
        <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load student breakdown</div>}>
          <HubStudentTypeBreakdown
            data={studentBreakdownData}
            defaultView="pie"
            isLoading={isLoadingStudentBreakdown}
          />
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
        </>
      )}
    </HubPageLayout>
    </TooltipProvider>
  );
};

export default DashboardPage;