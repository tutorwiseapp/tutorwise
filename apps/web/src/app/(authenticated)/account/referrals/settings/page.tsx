/**
 * Filename: src/app/(authenticated)/account/referrals/settings/page.tsx
 * Purpose: Referral settings page with commission delegation configuration
 * Created: 2025-12-16
 * Patent Reference: Section 7 (Commission Delegation Mechanism) - CORE NOVELTY
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import DelegationSettingsPanel from '@/app/components/feature/referrals/DelegationSettingsPanel';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import styles from './page.module.css';

export default function ReferralSettingsPage() {
  const { profile, activeRole, isLoading, needsOnboarding } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no profile, the user is not logged in
    if (!isLoading && !profile) {
      router.push('/login');
      return;
    }

    // Redirect to onboarding if not completed
    if (!isLoading && profile && needsOnboarding) {
      router.push('/onboarding');
      return;
    }

    // Only tutors and agents can access delegation settings
    if (!isLoading && profile && activeRole !== 'tutor' && activeRole !== 'agent') {
      router.push('/dashboard');
      return;
    }
  }, [isLoading, profile, needsOnboarding, activeRole, router]);

  if (isLoading || !profile || needsOnboarding) {
    return (
      <HubPageLayout header={<HubHeader title="Referral Settings" />}>
        <div className={styles.loading}>Loading...</div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Referral Settings"
          subtitle="Configure commission delegation for your listings"
        />
      }
    >
      <div className={styles.container}>
        <ErrorBoundary>
          <DelegationSettingsPanel tutorId={profile.id} />
        </ErrorBoundary>
      </div>
    </HubPageLayout>
  );
}
