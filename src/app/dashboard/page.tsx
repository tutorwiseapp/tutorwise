/*
 * Filename: src/app/dashboard/page.tsx
 * Purpose: Serves as the main navigation hub for authenticated users.
 *
 * Change History:
 * C005 - 2025-07-22 : 00:00 - Restored the linkText property to the card link.
 * C004 - 2025-07-21 : 23:30 - Updated to use a standard div with the new generic .gridCard class.
 * C003 - 2025-07-20 : 14:00 - Fixed property access to use snake_case.
 * C002 - 2025-07-20 : 09:00 - Refactored to use AuthProvider context.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-22 : 00:00
 * Requirement ID: VIN-A-002
 *
 * Change Summary:
 * The `.map()` function now correctly renders `link.linkText` as the content of the <Link>
 * component. This restores the visible action links at the bottom of each card, matching the
 * final design.
 *
 * Impact Analysis:
 * This fixes a regression and completes the intended design of the dashboard cards.
 *
 * Dependencies: "react", "next/link", "@/app/components/auth/AuthProvider", "@/app/components/layout/Container", "@/app/components/ui/PageHeader", "./page.module.css".
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthProvider';

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
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <Container><p className={styles.loading}>Loading...</p></Container>;
  }

  return (
    <Container>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome, ${user.display_name || 'User'} (${user.agent_id || ''})`}
      />
      <div className={styles.grid}>
        {dashboardLinks.map((link) => (
          <div key={link.href} className={styles.gridCard}>
            <div className={styles.cardContent}>
              <h3>{link.title}</h3>
              <p>{link.description}</p>
            </div>
            {/* --- THIS IS THE FIX --- */}
            <Link href={link.href} className={styles.cardLink}>{link.linkText}</Link>
          </div>
        ))}
      </div>
    </Container>
  );
};

export default DashboardPage;