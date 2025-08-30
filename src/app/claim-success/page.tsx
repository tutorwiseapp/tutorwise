/*
 * Filename: src/app/claim-success/page.tsx
 * Purpose: Displays a confirmation message after a user successfully claims a reward, migrated to Kinde.
 * Change History:
 * C002 - 2025-08-26 : 14:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * C001 - 2025-07-26 : 23:30 - Replaced useAuth with Clerk's useUser hook.
 * Last Modified: 2025-08-26 : 14:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This component has been migrated from Clerk to Kinde. The `useUser` hook was replaced with `useKindeBrowserClient` to manage authentication state, resolving the "Module not found" build error.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'; // --- THIS IS THE FIX ---
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

interface ClaimDetails {
  userName: string;
  serviceName: string;
}

const ClaimSuccessPage = () => {
  const { isAuthenticated, isLoading } = useKindeBrowserClient(); // --- THIS IS THE FIX ---
  const router = useRouter();
  const [claimDetails, setClaimDetails] = useState<ClaimDetails | null>(null);
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/api/auth/login'); // --- THIS IS THE FIX ---
      return;
    }
    
    if (isAuthenticated) {
        const detailsString = sessionStorage.getItem('vinite_claim_details');
        if (detailsString) {
          setClaimDetails(JSON.parse(detailsString));
          sessionStorage.removeItem('vinite_claim_details'); 
        } else {
          router.push('/dashboard');
        }
    }
  }, [isAuthenticated, isLoading, router]);

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
          Congratulations, {claimDetails.userName}! You've successfully claimed your reward for <strong>{claimDetails.serviceName}</strong>. We've added it to your account.
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