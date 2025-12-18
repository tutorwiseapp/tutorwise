/**
 * Filename: ReferralRecentList.tsx
 * Purpose: Display list of recent referrals with status badges
 * Created: 2025-12-17
 * Pattern: Extracted from ReferralDashboardWidget
 */

'use client';

import React, { memo } from 'react';
import { TrendingUp } from 'lucide-react';
import styles from './ReferralRecentList.module.css';

export interface RecentReferral {
  id: string;
  referred_profile_id: string;
  referred_user_name: string;
  referred_user_email: string;
  status: 'Referred' | 'Signed Up' | 'Converted' | 'Churned';
  attribution_method: 'url_parameter' | 'cookie' | 'manual_entry' | null;
  created_at: string;
  commission_amount?: number;
}

interface ReferralRecentListProps {
  referrals: RecentReferral[];
  isLoading?: boolean;
  className?: string;
  maxDisplay?: number;
  onViewAll?: () => void;
}

const ReferralRecentList = memo(function ReferralRecentList({
  referrals,
  isLoading = false,
  className = '',
  maxDisplay = 5,
  onViewAll,
}: ReferralRecentListProps) {
  // Status badge variant
  const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'neutral' => {
    switch (status) {
      case 'Converted':
        return 'success';
      case 'Signed Up':
        return 'info';
      case 'Referred':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  // Attribution method label
  const getAttributionLabel = (method: string | null): string => {
    switch (method) {
      case 'url_parameter':
        return 'Direct Link';
      case 'cookie':
        return 'Cookie Tracking';
      case 'manual_entry':
        return 'Manual Entry';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className={`${styles.widget} ${className}`}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <TrendingUp className={styles.icon} size={20} />
            <h3 className={styles.title}>Recent Referrals</h3>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  // Limit displayed referrals
  const displayedReferrals = referrals.slice(0, maxDisplay);
  const hasMore = referrals.length > maxDisplay;

  return (
    <div className={`${styles.widget} ${className}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <TrendingUp className={styles.icon} size={20} />
          <h3 className={styles.title}>Recent Referrals</h3>
        </div>
      </div>
      <div className={styles.content}>
        {referrals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No referrals yet. Share your link to start earning commissions!</p>
          </div>
        ) : (
          <>
            <div className={styles.referralsList}>
              {displayedReferrals.map((referral) => (
                <div key={referral.id} className={styles.referralCard}>
                  <div className={styles.referralInfo}>
                    <div className={styles.referralName}>{referral.referred_user_name}</div>
                    <div className={styles.referralMeta}>
                      {getAttributionLabel(referral.attribution_method)} •{' '}
                      {new Date(referral.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`${styles.statusBadge} ${styles[getStatusVariant(referral.status)]}`}>
                    {referral.status}
                  </div>
                </div>
              ))}
            </div>
            {hasMore && onViewAll && (
              <button className={styles.viewAllButton} onClick={onViewAll}>
                View All ({referrals.length})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default ReferralRecentList;
