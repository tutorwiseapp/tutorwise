/*
 * Filename: src/app/dashboard/page.tsx
 * Purpose: Serves as the main navigation hub for authenticated users.
 * Change History:
 * C007 - 2025-07-26 : 13:30 - Updated to read agent_id from Clerk's publicMetadata.
 * C006 - 2025-07-26 : 12:30 - Replaced `useAuth` with Clerk's `useUser` hook.
 * C005 - 2025-07-22 : 00:00 - Restored the linkText property to the card link.
 * C004 - 2025-07-21 : 23:30 - Updated to use a standard div with the new generic .gridCard class.
 * C003 - 2025-07-20 : 14:00 - Fixed property access to use snake_case.
 * Last Modified: 2025-07-26 : 13:30
 * Requirement ID: VIN-A-002
 * Change Summary: The component now reads the user's Vinite-specific `agent_id` from
 * `user.publicMetadata.agent_id`, which is populated by the new Clerk webhook system. This
 * correctly displays the full welcome message (e.g., "Welcome, Jane Doe (A1-JD123456)").
 * Impact Analysis: This change fixes the missing Agent ID bug on the dashboard. It relies
 * on the webhook system being correctly configured to populate the metadata for new users.
 * Dependencies: "@clerk/nextjs", "next/link", "next/navigation", and VDL UI components.
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import styles from './page.module.css';

const dashboardLinks = [
    { href: '/referral-activities', title: 'My Activity', description: 'Track results of Vinite links from create, share, convert, and reward.', linkText: 'View My Activity' },
    { href: '/transaction-history', title: 'Referral Earnings', description: 'View referral commission payouts received.', linkText: 'View Earnings' },
    { href: '/payments', title: 'Payments', description: 'Connect your bank account via Stripe to receive commission payouts.', linkText: 'Manage Payments' },
    { href: '/', title: 'Generate a Link', description: 'Create a new Vinite link to refer anything to anyone.', linkText: 'Generate Link' },
    { href: '/profile', title: 'My Profile', description: 'Update your public-facing profile information.', linkText: 'Edit Profile' },
    { href: '/settings', title: 'Settings', description: 'Manage account settings and notifications.', linkText: 'Go to Settings' },
    { href: '/become-provider', title: 'Become a Provider', description: 'List your service on Vinite to accept referrals and get new customers.', linkText: 'List Your Service' },
];

const DashboardPage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // This security check ensures only authenticated users can see this page.
  useEffect(() => {
    // While Clerk is loading the session, we don't do anything.
    if (!isLoaded) {
      return;
    }
    // Once the check is complete, if there is still no user,
    // we redirect to the sign-in page.
    if (!user) {
      router.push('/sign-in');
    }
  }, [user, isLoaded, router]);

  // While Clerk is loading, or if we are about to redirect,
  // show a clean loading state to prevent flashing content.
  if (!isLoaded || !user) {
    return (
      <Container>
        <p className={styles.loading}>Loading Dashboard...</p>
      </Container>
    );
  }

  // We now read the user's full name from Clerk and their agent_id from publicMetadata.
  const displayName = user.fullName || 'User';
  const agentId = (user.publicMetadata?.agent_id as string) || '';

  // If we reach this point, the user is confirmed to be logged in.
  return (
    <Container>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome, ${displayName} (${agentId})`}
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