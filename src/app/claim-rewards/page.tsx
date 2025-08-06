/*
 * Filename: src/app/claim-rewards/page.tsx
 * Purpose: Allows a new user to claim rewards associated with a temporary guest Agent ID.
 * Change History:
 * C001 - 2025-07-26 : 23:45 - Initial creation.
 * Last Modified: 2025-07-26 : 23:45
 * Requirement ID (optional): VIN-D-01.4
 * Change Summary: This new page provides the UI for the reward claiming flow. It reads a
 * `claimId` from the URL, displays mock details of the pending reward, and provides a button
 * for the user to confirm the claim. It is protected and requires a user to be logged in.
 * Impact Analysis: This is an additive change that creates a crucial step in the user
 * onboarding and reward lifecycle. It integrates seamlessly with the existing design system.
 * Dependencies: "@clerk/nextjs", "next/navigation", and VDL UI components.
 */
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import PageHeader from '@/app/components/ui/PageHeader';
import Message from '@/app/components/ui/Message';
import styles from './page.module.css'; // We will create this stylesheet next

// This is a placeholder for the actual data you would fetch
interface PendingReward {
  serviceName: string;
  rewardAmount: number;
}

// A new component to handle the logic, wrapped in Suspense for useSearchParams
const ClaimRewardsContent = () => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const claimId = searchParams.get('claimId');

    const [pendingReward, setPendingReward] = useState<PendingReward | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Protect the route
        if (isLoaded && !user) {
            router.push('/sign-in');
        }

        // Fetch mock pending reward details based on the claimId
        if (claimId) {
            // In a real app, you would make an API call here:
            // const data = await fetch(`/api/rewards/${claimId}`);
            setPendingReward({
                serviceName: 'SaaSify Subscription',
                rewardAmount: 3.00,
            });
        }
    }, [isLoaded, user, router, claimId]);

    const handleClaim = async () => {
        setIsLoading(true);
        setError('');

        try {
            // In a real app, you would make an API call to your backend here to:
            // 1. Validate the claimId
            // 2. Associate the pending rewards with the now-authenticated user (user.id)
            // 3. Mark the rewards as claimed
            
            // For now, we simulate success
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Store details for the success page
            sessionStorage.setItem('vinite_claim_details', JSON.stringify({
                userName: user?.firstName || 'User',
                serviceName: pendingReward?.serviceName
            }));
            
            router.push('/claim-success');

        } catch (err) {
            setError('Failed to claim reward. Please try again.');
            setIsLoading(false);
        }
    };

    if (!isLoaded || !user) {
        return <p>Loading...</p>;
    }

    if (!claimId || !pendingReward) {
        return <Message type="warning">No pending rewards found to claim.</Message>;
    }

    return (
        <Card>
            {error && <Message type="error">{error}</Message>}
            <div className={styles.claimDetails}>
                <p className={styles.claimText}>You have a pending reward for:</p>
                <h2 className={styles.serviceName}>{pendingReward.serviceName}</h2>
                <p className={styles.rewardAmount}>Amount: <strong>£{pendingReward.rewardAmount.toFixed(2)}</strong></p>
                <p className={styles.claimSubtext}>
                    This will be added to your Vinite account and paid out according to the terms of the referral.
                </p>
            </div>
            <Button
                variant="primary"
                fullWidth
                onClick={handleClaim}
                disabled={isLoading}
            >
                {isLoading ? 'Claiming...' : 'Claim My Reward'}
            </Button>
        </Card>
    );
};

const ClaimRewardsPage = () => {
  return (
    <Container variant="form">
      <PageHeader
        title="Claim Your Reward"
        subtitle="You're just one step away from claiming your Vinite earnings."
      />
      <Suspense fallback={<p>Loading reward details...</p>}>
        <ClaimRewardsContent />
      </Suspense>
    </Container>
  );
};

export default ClaimRewardsPage;