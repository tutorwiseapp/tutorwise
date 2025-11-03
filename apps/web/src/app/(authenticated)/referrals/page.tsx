/*
 * Filename: src/app/(authenticated)/referrals/page.tsx
 * Purpose: Referrals hub page - displays referral lead pipeline (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 4.3 - /referrals hub
 */
'use client';

import React, { useEffect, useState } from 'react';
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
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | 'all'>('all');

  useEffect(() => {
    if (!profile) return;

    const fetchReferrals = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Build query params
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);

        const response = await fetch(`/api/referrals?${params.toString()}`);

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
  }, [profile, statusFilter]);

  // Calculate referral stats
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

        {/* Status Filter */}
        <div className={styles.filterTabs}>
          <button
            onClick={() => setStatusFilter('all')}
            className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
          >
            All Leads
          </button>
          <button
            onClick={() => setStatusFilter('Referred')}
            className={`${styles.filterTab} ${statusFilter === 'Referred' ? styles.filterTabActive : ''}`}
          >
            Referred
          </button>
          <button
            onClick={() => setStatusFilter('Signed Up')}
            className={`${styles.filterTab} ${statusFilter === 'Signed Up' ? styles.filterTabActive : ''}`}
          >
            Signed Up
          </button>
          <button
            onClick={() => setStatusFilter('Converted')}
            className={`${styles.filterTab} ${statusFilter === 'Converted' ? styles.filterTabActive : ''}`}
          >
            Converted
          </button>
          <button
            onClick={() => setStatusFilter('Expired')}
            className={`${styles.filterTab} ${statusFilter === 'Expired' ? styles.filterTabActive : ''}`}
          >
            Expired
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!error && referrals.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <h3 className={styles.emptyTitle}>No referrals yet</h3>
            <p className={styles.emptyText}>
              {statusFilter === 'all'
                ? 'Share your referral link to start earning commissions!'
                : `You have no ${statusFilter.toLowerCase()} referrals.`}
            </p>
            <div className={styles.emptyActions}>
              <button onClick={handleCopyReferralLink} className={styles.copyButton}>
                📋 Copy Your Referral Link
              </button>
            </div>
          </div>
        )}

        {/* Referrals List */}
        {!error && referrals.length > 0 && (
          <div className={styles.referralsList}>
            {referrals.map((referral) => (
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
