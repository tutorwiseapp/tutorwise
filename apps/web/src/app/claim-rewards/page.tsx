'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/data-display/Card';
import Button from '@/app/components/ui/actions/Button';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import Message from '@/app/components/ui/feedback/Message';
import styles from './page.module.css';

interface PendingReward {
  serviceName: string;
  rewardAmount: number;
}

const ClaimRewardsContent = () => {
    const { profile, isLoading: isProfileLoading } = useUserProfile();
    const router = useRouter();
    const searchParams = useSearchParams();
    const claimId = searchParams?.get('claimId');

    const [pendingReward, setPendingReward] = useState<PendingReward | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isProfileLoading && !profile) {
            router.push('/login');
        }

        if (claimId) {
            setPendingReward({
                serviceName: 'SaaSify Subscription',
                rewardAmount: 3.00,
            });
        }
    }, [isProfileLoading, profile, router, claimId]);

    const handleClaim = async () => {
        setIsLoading(true);
        setError('');

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            sessionStorage.setItem('vinite_claim_details', JSON.stringify({
                userName: profile?.first_name || 'User',
                serviceName: pendingReward?.serviceName
            }));
            router.push('/claim-success');
        } catch (err) {
            setError('Failed to claim reward. Please try again.');
            setIsLoading(false);
        }
    };

    if (isProfileLoading || !profile) {
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
                    This will be added to your Tutorwise account and paid out according to the terms of the referral.
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
        subtitle="You're just one step away from claiming your Tutorwise earnings."
      />
      <Suspense fallback={<p>Loading reward details...</p>}>
        <ClaimRewardsContent />
      </Suspense>
    </Container>
  );
};

export default ClaimRewardsPage;