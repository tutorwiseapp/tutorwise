/*
 * Filename: src/app/dashboard/page.tsx
 * Purpose: Serves as the main hub for authenticated users, now using the UserProfileContext.
 * Change History:
 * C010 - 2025-09-01 : 19:00 - Replaced Kinde hook with useUserProfile to get full profile data.
 * C009 - 2025-08-26 : 19:00 - Converted from Server Component to Client Component.
 * Last Modified: 2025-09-01 : 19:00
 * Requirement ID: VIN-APP-01
 * Change Summary: This page has been refactored to use the new `useUserProfile` hook. This provides the complete profile data from the Supabase database, including the user's `agent_id`, which resolves the "Agent ID from DB" placeholder bug.
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext'; // --- THIS IS THE FIX ---
import Container from '@/app/components/layout/Container';
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
    { href: '/my-listings', title: 'My Listings', description: 'View and manage your tutoring service listings.', linkText: 'View Listings' },
    { href: '/my-listings/create', title: 'Create New Listing', description: 'Create a new service listing to attract students.', linkText: 'Create Listing' },
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
    return <Container><p className={styles.loading}>Loading...</p></Container>;
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
    <Container>
      <PageHeader
        title={getDashboardTitle()}
        subtitle={`Welcome, ${firstName} (${getFormattedRole()})`}
      />

      <div className={styles.grid}>
        {dashboardLinks.map((link) => (
          <div key={link.href} className={styles.gridCard}>
            <div className={styles.cardContent}>
              <h3>{link.title}</h3>
              <p>{link.description}</p>
            </div>
            <Link href={link.href} className={styles.cardLink}>{link.linkText}</Link>
          </div>
        ))}
      </div>
    </Container>
  );
};

export default DashboardPage;