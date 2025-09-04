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
  const { profile, isLoading } = useUserProfile(); // --- THIS IS THE FIX ---
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no profile, the user is not logged in.
    if (!isLoading && !profile) {
      router.push('/login');
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
    return <Container><p className={styles.loading}>Loading...</p></Container>;
  }

  const displayName = profile.display_name || 'User';
  const agentId = `(${profile.agent_id})`; // --- THIS IS THE FIX: Real agent_id

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