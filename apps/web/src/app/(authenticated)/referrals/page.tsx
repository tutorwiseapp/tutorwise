/*
 * Filename: src/app/(authenticated)/referrals/page.tsx
 * Purpose: Referrals hub page - displays referral lead pipeline (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-30 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs
 * Specification: SDD v3.6, Section 4.3 - /referrals hub, Section 2.0 - Server-side filtering via URL params
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyReferrals } from '@/lib/api/referrals';
import ReferralCard from '@/app/components/referrals/ReferralCard';
import ReferralAssetWidget from '@/app/components/referrals/ReferralAssetWidget';
import ReferralStatsWidget from '@/app/components/referrals/ReferralStatsWidget';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import ReferralsSkeleton from '@/app/components/referrals/ReferralsSkeleton';
import ReferralsError from '@/app/components/referrals/ReferralsError';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/ui/hub-layout';
import type { HubTab } from '@/app/components/ui/hub-layout';
import Button from '@/app/components/ui/Button';
import toast from 'react-hot-toast';
import { Referral, ReferralStatus } from '@/types';
import styles from './page.module.css';
import actionStyles from '@/app/components/ui/hub-layout/hub-actions.module.css';

export default function ReferralsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter from URL (SDD v3.6: URL is single source of truth)
  const statusFilter = (searchParams?.get('status') as ReferralStatus | null) || 'all';

  // State for actions menu
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // React Query: Fetch referrals with automatic retry, caching, and background refetch
  const {
    data: referrals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['referrals', profile?.id],
    queryFn: getMyReferrals,
    enabled: !!profile && !profileLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes (referrals change less frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Update URL when filter changes
  const handleFilterChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus === 'all') {
      params.delete('status');
    } else {
      params.set('status', newStatus);
    }
    router.push(`/referrals${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  // Client-side filtering based on URL param
  const filteredReferrals = useMemo(() => {
    return referrals.filter((referral: any) => {
      if (statusFilter === 'all') return true;
      return referral.status === statusFilter;
    });
  }, [referrals, statusFilter]);

  // Calculate referral stats (from ALL referrals, not filtered)
  const stats = useMemo(() => {
    return referrals.reduce(
      (acc: any, ref: any) => {
        acc.totalReferred++;
        if (ref.status === 'Signed Up' || ref.status === 'Converted') {
          acc.signedUp++;
        }
        if (ref.status === 'Converted') {
          acc.converted++;
          if (ref.first_commission) {
            acc.totalEarned += ref.first_commission.amount;
          }
        }
        return acc;
      },
      { totalReferred: 0, signedUp: 0, converted: 0, totalEarned: 0 }
    );
  }, [referrals]);

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'all', label: 'All Leads', active: statusFilter === 'all' },
    { id: 'Referred', label: 'Referred', active: statusFilter === 'Referred' },
    { id: 'Signed Up', label: 'Signed Up', active: statusFilter === 'Signed Up' },
    { id: 'Converted', label: 'Converted', active: statusFilter === 'Converted' },
    { id: 'Expired', label: 'Expired', active: statusFilter === 'Expired' },
  ];

  // Action handlers (placeholder for now)
  const handlePrimaryAction = () => {
    toast('Primary action coming soon!', { icon: '🚀' });
  };

  const handleSecondaryAction1 = () => {
    toast('Secondary action 1 coming soon!', { icon: '⚡' });
    setShowActionsMenu(false);
  };

  const handleSecondaryAction2 = () => {
    toast('Secondary action 2 coming soon!', { icon: '✨' });
    setShowActionsMenu(false);
  };

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Referrals" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleFilterChange} />}
        sidebar={
          <ContextualSidebar>
            <ReferralStatsWidget
              totalReferred={0}
              signedUp={0}
              converted={0}
            />
          </ContextualSidebar>
        }
      >
        <ReferralsSkeleton />
      </HubPageLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Referrals" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleFilterChange} />}
        sidebar={
          <ContextualSidebar>
            <ReferralStatsWidget
              totalReferred={0}
              signedUp={0}
              converted={0}
            />
          </ContextualSidebar>
        }
      >
        <ReferralsError error={error as Error} onRetry={() => refetch()} />
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Referrals"
          actions={
            <>
              {/* Primary Action Button (Placeholder) */}
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrimaryAction}
              >
                Primary Action
              </Button>

              {/* Secondary Actions: Dropdown Menu (Placeholder) */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu} style={{ display: 'block' }}>
                      <button
                        onClick={handleSecondaryAction1}
                        className={actionStyles.menuButton}
                      >
                        Secondary Action 1
                      </button>
                      <button
                        onClick={handleSecondaryAction2}
                        className={actionStyles.menuButton}
                      >
                        Secondary Action 2
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleFilterChange} />}
      sidebar={
        <ContextualSidebar>
          <ReferralStatsWidget
            totalReferred={stats.totalReferred}
            signedUp={stats.signedUp}
            converted={stats.converted}
          />

          {profile?.referral_code && (
            <ReferralAssetWidget
              referralCode={profile.referral_code}
              variant="dashboard"
            />
          )}
        </ContextualSidebar>
      }
    >
      {/* Empty State */}
      {filteredReferrals.length === 0 && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>No referrals found</h3>
          <p className={styles.emptyText}>
            {statusFilter === 'all'
              ? 'Share your referral link to start earning commissions!'
              : `You have no ${statusFilter.toLowerCase()} referrals.`}
          </p>
        </div>
      )}

      {/* Referrals List */}
      {filteredReferrals.length > 0 && (
        <div className={styles.referralsList}>
          {filteredReferrals.map((referral: any) => (
            <ReferralCard key={referral.id} referral={referral} />
          ))}
        </div>
      )}
    </HubPageLayout>
  );
}
