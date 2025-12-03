/**
 * Filename: apps/web/src/app/components/feature/reviews/ReviewsSkeleton.tsx
 * Purpose: Loading skeleton for reviews page
 * Created: 2025-11-08
 */

import React from 'react';
import styles from './ReviewsSkeleton.module.css';

interface ReviewsSkeletonProps {
  count?: number;
}

export default function ReviewsSkeleton({ count = 3 }: ReviewsSkeletonProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSkeleton} />
        <div className={styles.subtitleSkeleton} />
      </div>

      <div className={styles.tabsSkeleton}>
        <div className={styles.tab} />
        <div className={styles.tab} />
        <div className={styles.tab} />
      </div>

      <div className={styles.reviewsList}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={styles.reviewCard}>
            <div className={styles.cardHeader}>
              <div className={styles.avatar} />
              <div className={styles.nameDate}>
                <div className={styles.name} />
                <div className={styles.date} />
              </div>
            </div>
            <div className={styles.rating} />
            <div className={styles.comment} />
          </div>
        ))}
      </div>
    </div>
  );
}
