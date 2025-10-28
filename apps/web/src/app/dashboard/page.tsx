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

// Role-specific dashboard links
const getDashboardLinks = (role: string | null) => {
  // Referral cards - common to all roles
  const referralLinks = [
    { href: '/referral-activities', title: 'My Activity', description: 'Track results of your referral links.', linkText: 'View Activity' },
    { href: '/transaction-history', title: 'Referral Earnings', description: 'View referral commission payouts received.', linkText: 'View Earnings' },
    { href: '/payments', title: 'Payments', description: 'Connect your bank account via Stripe to receive payouts.', linkText: 'Manage Payments' },
  ];

  const commonLinks = [
    { href: '/profile', title: 'My Profile', description: 'Update your public-facing profile information.', linkText: 'Edit Profile' },
    { href: '/settings', title: 'Settings', description: 'Manage account settings and notifications.', linkText: 'Go to Settings' },
  ];

  const providerLinks = [
    { href: '/my-listings', title: 'My Listings', description: 'View and manage your tutoring service listings.', linkText: 'View Listings' },
    { href: '/my-listings/create', title: 'Create New Listing', description: 'Create a new service listing to attract students.', linkText: 'Create Listing' },
    { href: '/marketplace', title: 'Browse Marketplace', description: 'See how your listings appear to students.', linkText: 'View Marketplace' },
    ...referralLinks,
    ...commonLinks,
  ];

  const seekerLinks = [
    { href: '/marketplace', title: 'Find Tutors', description: 'Browse and connect with qualified tutors.', linkText: 'Browse Tutors' },
    { href: '/bookings', title: 'My Bookings', description: 'View your upcoming and past tutoring sessions.', linkText: 'View Bookings' },
    ...referralLinks,
    ...commonLinks,
  ];

  const agentLinks = [
    // Agents can do everything - they manage the platform
    { href: '/marketplace', title: 'Find Tutors', description: 'Browse and connect with qualified tutors.', linkText: 'Browse Tutors' },
    { href: '/my-listings', title: 'My Listings', description: 'View and manage tutoring service listings.', linkText: 'View Listings' },
    { href: '/my-listings/create', title: 'Create New Listing', description: 'Create a new service listing.', linkText: 'Create Listing' },
    { href: '/bookings', title: 'My Bookings', description: 'View upcoming and past tutoring sessions.', linkText: 'View Bookings' },
    ...referralLinks,
    ...commonLinks,
  ];

  switch (role) {
    case 'tutor': return providerLinks;
    case 'client': return seekerLinks;
    case 'agent': return agentLinks;
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