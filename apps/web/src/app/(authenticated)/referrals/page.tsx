/*
 * Filename: src/app/(authenticated)/referrals/page.tsx
 * Purpose: Referrals hub page - displays referral lead pipeline (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-09 - Migrated to React Query for robust data fetching
 * Specification: SDD v3.6, Section 4.3 - /referrals hub, Section 2.0 - Server-side filtering via URL params
 */
'use client';

import React, { useMemo } from 'react';
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
import { Referral, ReferralStatus } from '@/types';
import styles from './page.module.css';

export default function ReferralsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter from URL (SDD v3.6: URL is single source of truth)
  const statusFilter = (searchParams?.get('status') as ReferralStatus | null) || 'all';

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
  const handleFilterChange = (newStatus: ReferralStatus | 'all') => {
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

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <>
        <ReferralsSkeleton />
        <ContextualSidebar>
          <ReferralStatsWidget
            totalReferred={0}
            signedUp={0}
            converted={0}
          />
        </ContextualSidebar>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <ReferralsError error={error as Error} onRetry={() => refetch()} />
        <ContextualSidebar>
          <ReferralStatsWidget
            totalReferred={0}
            signedUp={0}
            converted={0}
          />
        </ContextualSidebar>
      </>
    );
  }

  return (
    <>
      {/* Main Content */}
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Referrals</h1>
          <p className={styles.subtitle}>
            Track your referral pipeline and earn 10% commission on first bookings
          </p>
        </div>
      </div>

      {/* Status Filter - Full width outside container */}
      <div className={styles.filterTabs}>
          <button
            onClick={() => handleFilterChange('all')}
            className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
          >
            All Leads
          </button>
          <button
            onClick={() => handleFilterChange('Referred')}
            className={`${styles.filterTab} ${statusFilter === 'Referred' ? styles.filterTabActive : ''}`}
          >
            Referred
          </button>
          <button
            onClick={() => handleFilterChange('Signed Up')}
            className={`${styles.filterTab} ${statusFilter === 'Signed Up' ? styles.filterTabActive : ''}`}
          >
            Signed Up
          </button>
          <button
            onClick={() => handleFilterChange('Converted')}
            className={`${styles.filterTab} ${statusFilter === 'Converted' ? styles.filterTabActive : ''}`}
          >
            Converted
          </button>
          <button
            onClick={() => handleFilterChange('Expired')}
            className={`${styles.filterTab} ${statusFilter === 'Expired' ? styles.filterTabActive : ''}`}
          >
            Expired
          </button>
      </div>

      {/* Content container */}
      <div className={styles.container}>
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
      </div>

      {/* Contextual Sidebar (Right Column) */}
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
    </>
  );
}
