'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card'; // Using the standard Card component
import styles from './page.module.css';

const dashboardLinks = [
    { href: '/my-activity', title: 'My Activity', description: 'Track results of Vinite links from create, share, convert, and reward.', linkText: 'View My Activity' },
    { href: '/earnings', title: 'Referral Earnings', description: 'View referral commission payouts received.', linkText: 'View Earnings' },
    { href: '/payments', title: 'Payments', description: 'Connect your bank account via Stripe to receive commission payouts.', linkText: 'Manage Payments' },
    { href: '/', title: 'Generate a Link', description: 'Create a new Vinite link to refer anything to anyone.', linkText: 'Generate Link' },
    { href: '/profile', title: 'My Profile', description: 'Update your public-facing profile information.', linkText: 'Edit Profile' },
    { href: '/settings', title: 'Settings', description: 'Manage account settings and notifications.', linkText: 'Go to Settings' },
];

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loggedInUserString = localStorage.getItem('vinite_loggedin_user');
    if (loggedInUserString) {
      setUser(JSON.parse(loggedInUserString));
    } else {
      router.push('/login'); 
    }
  }, [router]);

  if (!user) {
    // Render a loading state or null while checking for user
    return <Container><p className={styles.loading}>Loading...</p></Container>;
  }

  return (
    <Container>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome, ${user.displayName} (${user.agentId})`}
      />
      <div className={styles.grid}>
        {dashboardLinks.map((link) => (
          // Using the reusable Card component for each item
          <Card key={link.href} className={styles.dashboardCard}>
            <div className={styles.cardContent}>
              <h3>{link.title}</h3>
              <p>{link.description}</p>
            </div>
            <Link href={link.href} className={styles.cardLink}>{link.linkText}</Link>
          </Card>
        ))}
      </div>
    </Container>
  );
};

export default DashboardPage;