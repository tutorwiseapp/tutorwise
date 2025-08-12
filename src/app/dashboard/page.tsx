/*
 * Filename: src/app/dashboard/page.tsx
 * Purpose: Serves as the main navigation hub for authenticated users.
 * Change History:
 * C008 - 2025-08-08 : 15:00 - Refactored to Server Component for instant data load.
 * C007 - 2025-07-26 : 13:30 - Updated to read agent_id from Clerk's publicMetadata.
 * C006 - 2025-07-26 : 12:30 - Replaced `useAuth` with Clerk's `useUser` hook.
 * Last Modified: 2025-08-08 : 15:00
 * Requirement ID: VIN-A-002
 * Change Summary: This page has been refactored from a Client Component to a Server Component. The `'use client'` directive was removed. It now uses Clerk's `currentUser()` function on the server to fetch user data *before* the page is rendered. This eliminates the client-side loading delay, making the Agent ID appear instantly for a vastly improved user experience.
 * Impact Analysis: This change significantly improves the perceived performance of the dashboard. It is a critical UX enhancement.
 * Dependencies: "@clerk/nextjs", "next/link", and VDL UI components.
 */
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server'; // --- FIX: Import the server-side helper
import { redirect } from 'next/navigation';

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

// The component is now an async function
const DashboardPage = async () => {
  // --- FIX: Fetch the user on the server ---
  const user = await currentUser();

  // If the user is not logged in, the middleware should have already redirected.
  // This is an extra layer of security.
  if (!user) {
    redirect('/sign-in');
  }

  const displayName = user.fullName || 'User';
  const agentId = (user.publicMetadata?.agent_id as string) || '';

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