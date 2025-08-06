/*
 * Filename: src/app/claim-success/page.tsx
 * Purpose: Displays a confirmation message after a user successfully claims a reward.
 * Change History:
 * C001 - 2025-07-26 : 23:30 - Replaced `useAuth` with Clerk's `useUser` hook.
 * Last Modified: 2025-07-26 : 23:30
 * Requirement ID (optional): VIN-D-01.4
 * Change Summary: Surgically replaced the old `useAuth` hook with `useUser` from Clerk. Added a
 * `useEffect` hook to protect the route and handle loading states, ensuring that only
 * authenticated users can view this page.
 * Impact Analysis: This change completes the migration of the claim success page to the Clerk
 * authentication system, making the feature functional and secure.
 * Dependencies: "@clerk/nextjs", "next/navigation", and VDL UI components.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

interface ClaimDetails {
  userName: string;
  serviceName: string;
}

const ClaimSuccessPage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [claimDetails, setClaimDetails] = useState<ClaimDetails | null>(null);
  
  useEffect(() => {
    // First, handle the authentication check. Redirect if not loaded or not logged in.
    if (isLoaded && !user) {
      router.push('/sign-in');
      return;
    }
    
    // Once we know the user is logged in, then we check for the claim details.
    if (user) {
        const detailsString = sessionStorage.getItem('vinite_claim_details');
        if (detailsString) {
          setClaimDetails(JSON.parse(detailsString));
          sessionStorage.removeItem('vinite_claim_details'); 
        } else {
          // If the user lands here directly without the session storage item,
          // redirect them to a safe page.
          router.push('/dashboard');
        }
    }
  }, [user, isLoaded, router]);

  // Show a loading state while Clerk is verifying the user or before redirecting.
  if (!isLoaded || !claimDetails) {
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