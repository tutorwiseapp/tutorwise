/*
 * Filename: src/app/claim-rewards/page.tsx
 * Purpose: Allows a new user to claim rewards, migrated to Kinde.
 * Change History:
 * C002 - 2025-08-26 : 14:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * C001 - 2025-07-26 : 23:45 - Initial creation.
 * Last Modified: 2025-08-26 : 14:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This component has been migrated from Clerk to Kinde. The `useUser` hook was replaced with `useKindeBrowserClient` to manage authentication state, resolving the "Module not found" build error.
 */
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'; // --- THIS IS THE FIX ---
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import PageHeader from '@/app/components/ui/PageHeader';
import Message from '@/app/components/ui/Message';
import styles from './page.module.css';

interface PendingReward {
  serviceName: string;
  rewardAmount: number;
}

const ClaimRewardsContent = () => {
    const { user, isAuthenticated, isLoading: isKindeLoading } = useKindeBrowserClient(); // --- THIS IS THE FIX ---
    const router = useRouter();
    const searchParams = useSearchParams();
    const claimId = searchParams.get('claimId');

    const [pendingReward, setPendingReward] = useState<PendingReward | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isKindeLoading && !isAuthenticated) {
            router.push('/api/auth/login'); // --- THIS IS THE FIX ---
        }

        if (claimId) {
            setPendingReward({
                serviceName: 'SaaSify Subscription',
                rewardAmount: 3.00,
            });
        }
    }, [isKindeLoading, isAuthenticated, router, claimId]);

    const handleClaim = async () => {
        setIsLoading(true);
        setError('');

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            sessionStorage.setItem('vinite_claim_details', JSON.stringify({
                userName: user?.given_name || 'User', // --- THIS IS THE FIX ---
                serviceName: pendingReward?.serviceName
            }));
            router.push('/claim-success');
        } catch (err) {
            setError('Failed to claim reward. Please try again.');
            setIsLoading(false);
        }
    };

    if (isKindeLoading || !isAuthenticated) {
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