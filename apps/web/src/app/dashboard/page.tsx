/*
 * Filename: src/app/dashboard/page.tsx
 * Purpose: Unified dashboard hub with 3-column layout (AppSidebar + Cards + Stats)
 * Change History:
 * C011 - 2025-11-08 : 12:00 - Transformed into unified hub with aggregated stats sidebar
 * C010 - 2025-09-01 : 19:00 - Replaced Kinde hook with useUserProfile to get full profile data.
 * C009 - 2025-08-26 : 19:00 - Converted from Server Component to Client Component.
 * Last Modified: 2025-11-08 : 12:00
 * Requirement ID: VIN-APP-01
 * Change Summary: Added 3-column unified hub layout with AppSidebar (universal nav), dashboard cards (role-specific), and DashboardStatsWidget (aggregated stats). Preserved all existing role-based logic and onboarding redirects.
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import AppSidebar from '@/app/components/layout/sidebars/AppSidebar';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import DashboardStatsWidget from '@/app/components/dashboard/DashboardStatsWidget';
import PageHeader from '@/app/components/ui/PageHeader';
import styles from './page.module.css';

// Role-specific dashboard links (SDD v3.6 - prioritized order)
const getDashboardLinks = (role: string | null) => {
  const commonLinks = [
    { href: '/profile', title: 'My Profile', description: 'Update your public-facing profile information.', linkText: 'Edit Profile' },
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
      <div className={styles.unifiedHub}>
        <AppSidebar />
        <main className={styles.centerColumn}>
          <p className={styles.loading}>Loading...</p>
        </main>
      </div>
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

  // Welcome message for new users
  const getWelcomeMessage = () => {
    switch (activeRole) {
      case 'tutor':
        return 'Ready to start teaching? Create your first listing to connect with students!';
      case 'client':
        return 'Find the perfect tutor to help you achieve your learning goals!';
      case 'agent':
        return 'Start referring services and earning commissions!';
      default:
        return 'Your dashboard is ready to use!';
    }
  };

  return (
    <div className={styles.unifiedHub}>
      {/* Left Sidebar - Universal Navigation */}
      <AppSidebar />

      {/* Center Column - Dashboard Cards */}
      <main className={styles.centerColumn}>
        <PageHeader
          title={getDashboardTitle()}
          subtitle={`Welcome, ${firstName} (${getFormattedRole()})`}
        />

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
      </main>

      {/* Right Sidebar - Aggregated Stats */}
      <ContextualSidebar>
        <DashboardStatsWidget />
      </ContextualSidebar>
    </div>
  );
};

export default DashboardPage;