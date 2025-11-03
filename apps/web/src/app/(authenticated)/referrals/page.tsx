/*
 * Filename: src/app/(authenticated)/referrals/page.tsx
 * Purpose: Referrals hub page - displays referral lead pipeline (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-03 - Refactored to use URL query parameters for filters (SDD v3.6 compliance)
 * Specification: SDD v3.6, Section 4.3 - /referrals hub, Section 2.0 - Server-side filtering via URL params
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ReferralCard from '@/app/components/referrals/ReferralCard';
import ContextualSidebar, {
  ReferralStatsWidget,
  ReferralLinkWidget,
} from '@/app/components/layout/sidebars/ContextualSidebar';
import { Referral, ReferralStatus } from '@/types';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

export default function ReferralsPage() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read filter from URL (SDD v3.6: URL is single source of truth)
  const statusFilter = (searchParams?.get('status') as ReferralStatus | null) || 'all';

  // Update URL when filter changes
  const handleFilterChange = (newStatus: ReferralStatus | 'all') => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus === 'all') {
      params.delete('status');
    } else {
      params.set('status', newStatus);
    }
    router.push(`/referrals${params.toString() ? `?${params.toString()}` : ''}`);
  };

  useEffect(() => {
    if (!profile) return;

    const fetchReferrals = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Fetch ALL referrals (no filter params - client-side filtering)
        const response = await fetch(`/api/referrals`);

        if (!response.ok) {
          throw new Error('Failed to fetch referrals');
        }

        const data = await response.json();
        setReferrals(data.referrals || []);
      } catch (err) {
        console.error('Error fetching referrals:', err);
        setError(err instanceof Error ? err.message : 'Failed to load referrals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferrals();
  }, [profile]); // Only re-fetch when profile changes, not on filter change

  // Client-side filtering based on URL param
  const filteredReferrals = referrals.filter((referral) => {
    if (statusFilter === 'all') return true;
    return referral.status === statusFilter;
  });

  // Calculate referral stats (from ALL referrals, not filtered)
  const stats = referrals.reduce(
    (acc, ref) => {
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

  const handleCopyReferralLink = () => {
    const referralCode = profile?.referral_code || profile?.referral_id || '';
    const referralUrl = `${window.location.origin}/a/${referralCode}`;

    navigator.clipboard.writeText(referralUrl).then(
      () => {
        alert('Referral link copied to clipboard!');
      },
      (err) => {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link. Please try again.');
      }
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading referrals...</div>
      </div>
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
        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!error && filteredReferrals.length === 0 && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No referrals found</h3>
            <p className={styles.emptyText}>
              {statusFilter === 'all'
                ? 'Share your referral link to start earning commissions!'
                : `You have no ${statusFilter.toLowerCase()} referrals.`}
            </p>
            <div className={styles.emptyActions}>
              <button onClick={handleCopyReferralLink} className={styles.copyButton}>
                Copy Your Referral Link
              </button>
            </div>
          </div>
        )}

        {/* Referrals List */}
        {!error && filteredReferrals.length > 0 && (
          <div className={styles.referralsList}>
            {filteredReferrals.map((referral) => (
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
          totalEarned={stats.totalEarned}
        />

        <ReferralLinkWidget
          referralCode={profile?.referral_code || profile?.referral_id || ''}
          onCopy={handleCopyReferralLink}
        />
      </ContextualSidebar>
    </>
  );
}
