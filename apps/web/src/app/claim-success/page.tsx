'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

interface ClaimDetails {
  userName: string;
  serviceName: string;
}

const ClaimSuccessPage = () => {
  const { profile, isLoading } = useUserProfile();
  const router = useRouter();
  const [claimDetails, setClaimDetails] = useState<ClaimDetails | null>(null);
  
  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login');
      return;
    }
    
    if (profile) {
        const detailsString = sessionStorage.getItem('vinite_claim_details');
        if (detailsString) {
          setClaimDetails(JSON.parse(detailsString));
          sessionStorage.removeItem('vinite_claim_details'); 
        } else {
          router.push('/dashboard');
        }
    }
  }, [profile, isLoading, router]);

  if (isLoading || !claimDetails) {
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
          <Link href="/financials">
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