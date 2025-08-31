/*
 * Filename: src/app/dashboard/page.tsx
 * Purpose: Serves as the main hub for authenticated users, migrated to Kinde.
 * Change History:
 * C009 - 2025-08-26 : 19:00 - Converted from Server Component to Client Component to use Kinde's hook.
 * C008 - 2025-08-08 : 15:00 - Refactored to Server Component for instant data load with Clerk.
 * Last Modified: 2025-08-26 : 19:00
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This page has been converted from a Server Component to a Client Component to align with Kinde's SDK. The Clerk `currentUser()` helper has been replaced with the `useKindeBrowserClient` hook. A loading state has been added, and the page is now protected by a `useEffect` hook that redirects unauthenticated users. This is a necessary architectural change for the Kinde migration and resolves the build error.
 */
'use client'; // --- THIS IS THE CRITICAL FIX ---

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'; // --- THIS IS THE FIX ---

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
  const { user, isAuthenticated, isLoading } = useKindeBrowserClient(); // --- THIS IS THE FIX ---
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/api/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return <Container><p className={styles.loading}>Loading...</p></Container>;
  }

  const displayName = `${user.given_name || ''} ${user.family_name || ''}`.trim() || 'User';
  // Note: agent_id will need to be fetched from your backend, as it's not in the Kinde token.
  const agentId = `(Agent ID from DB)`; 

  return (
    <Container>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome, ${displayName} ${agentId}`}
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