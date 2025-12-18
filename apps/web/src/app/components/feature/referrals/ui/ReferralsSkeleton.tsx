/**
 * Filename: apps/web/src/app/components/referrals/ReferralsSkeleton.tsx
 * Purpose: Loading skeleton for referrals page
 * Created: 2025-11-09
 */

import React from 'react';
import styles from './ReferralsSkeleton.module.css';

interface ReferralsSkeletonProps {
  count?: number;
}

export default function ReferralsSkeleton({ count = 3 }: ReferralsSkeletonProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSkeleton} />
        <div className={styles.subtitleSkeleton} />
      </div>

      <div className={styles.filterSkeleton}>
        <div className={styles.filterTab} />
        <div className={styles.filterTab} />
        <div className={styles.filterTab} />
        <div className={styles.filterTab} />
        <div className={styles.filterTab} />
      </div>

      <div className={styles.referralsList}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={styles.referralCard}>
            <div className={styles.cardHeader}>
              <div className={styles.status} />
              <div className={styles.date} />
            </div>
            <div className={styles.email} />
            <div className={styles.details}>
              <div className={styles.detailItem} />
              <div className={styles.detailItem} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
