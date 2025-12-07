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
import DashboardStatsWidget from '@/app/components/feature/dashboard/DashboardStatsWidget';
import { PendingLogsWidget } from '@/app/components/feature/dashboard/PendingLogsWidget';
import KPIGrid, { KPIData } from '@/app/components/feature/dashboard/widgets/KPIGrid';
import styles from './page.module.css';

// Role-specific dashboard links (SDD v3.6 - prioritized order)
const getDashboardLinks = (role: string | null) => {
  const commonLinks = [
    { href: '/account/personal-info', title: 'My Profile', description: 'Update your public-facing profile information.', linkText: 'Edit Profile' },
    { href: '/settings', title: 'Settings', description: 'Manage account settings and notifications.', linkText: 'Go to Settings' },
  ];

  // CLIENT: Prioritized by immediate needs
  const clientLinks = [
    { href: '/bookings', title: 'Bookings', description: 'View your upcoming and past tutoring sessions.', linkText: 'View Bookings' },
    { href: '/marketplace', title: 'Find Tutors', description: 'Browse and connect with qualified tutors.', linkText: 'Browse Tutors' },
    { href: '/financials', title: 'Financials', description: 'Track your payments and transaction history.', linkText: 'View Financials' },
    { href: '/referrals', title: 'Referrals', description: 'Earn 10% commission by referring others.', linkText: 'View Referrals' },
    ...commonLinks,
  ];

  // TUTOR/AGENT: Prioritized by business operations
  const tutorLinks = [
    { href: '/bookings', title: 'Bookings', description: 'Manage your upcoming and past tutoring sessions.', linkText: 'View Bookings' },
    { href: '/financials', title: 'Financials', description: 'Track your earnings, payouts, and commissions.', linkText: 'View Financials' },
    { href: '/listings', title: 'My Listings', description: 'View and manage your tutoring service listings.', linkText: 'View Listings' },
    { href: '/create-listing', title: 'Create New Listing', description: 'Create a new service listing to attract students.', linkText: 'Create Listing' },
    { href: '/referrals', title: 'Referrals', description: 'Track your referral pipeline and earn commissions.', linkText: 'View Referrals' },
    { href: '/marketplace', title: 'Browse Marketplace', description: 'See how your listings appear to students.', linkText: 'View Marketplace' },
    ...commonLinks,
  ];

  switch (role) {
    case 'tutor': return tutorLinks;
    case 'agent': return tutorLinks; // Agents use same order as tutors
    case 'client': return clientLinks;
    default: return commonLinks;
  }
};

const DashboardPage = () => {
  const { profile, activeRole, isLoading, needsOnboarding } = useUserProfile();
  const router = useRouter();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);

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

  const dashboardLinks = getDashboardLinks(activeRole);

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
          {/* WiseSpace v5.8: Pending Actions widget for tutors */}
          {(activeRole === 'tutor' || activeRole === 'agent') && <PendingLogsWidget />}
          <DashboardStatsWidget />
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

      {/* Dashboard Cards Grid */}
      <div className={styles.grid}>
        {dashboardLinks.map((link) => (
          <Link key={link.href} href={link.href} className={styles.gridCard}>
            <div className={styles.cardContent}>
              <h3>{link.title}</h3>
              <p>{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </HubPageLayout>
  );
};

export default DashboardPage;