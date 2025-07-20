'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { useAuth } from '@/app/components/auth/AuthProvider';
import styles from './page.module.css';

interface ClaimDetails {
  userName: string;
  serviceName: string;
}

const ClaimSuccessPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [claimDetails, setClaimDetails] = useState<ClaimDetails | null>(null);
  
  useEffect(() => {
    // On mount, check if user is authenticated and if claim details exist.
    if (!user) {
      router.push('/login');
      return;
    }

    const detailsString = sessionStorage.getItem('vinite_claim_details');
    if (detailsString) {
      setClaimDetails(JSON.parse(detailsString));
      // Clean up the sessionStorage item so it's not reused.
      sessionStorage.removeItem('vinite_claim_details'); 
    } else {
      // If the user lands here directly without going through the flow,
      // just redirect them to the dashboard.
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!claimDetails) {
    // Show a loading state or a fallback until details are loaded/checked.
    return (
      <Container className={styles.container}>
        <p>Verifying your claim...</p>
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <Card className={styles.successCard}>
        <div className={styles.iconWrapper}>
          <span className="material-symbols-outlined">verified</span>
        </div>
        <h1 className={styles.title}>Reward Claimed!</h1>
        <p className={styles.subtitle}>
          Congratulations, {claimDetails.userName}! You&apos;ve successfully claimed your reward for <strong>{claimDetails.serviceName}</strong>. We&apos;ve added it to your account.
        </p>
        <div className={styles.buttonGroup}>
          <Link href="/transaction-history">
            <Button variant="primary">View My Rewards</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">Go to My Dashboard</Button>
          </Link>
        </div>
      </Card>
    </Container>
  );
};

export default ClaimSuccessPage;