/**
 * Filename: apps/web/src/app/components/reviews/ReviewStatsWidget.tsx
 * Purpose: Stats widget for Reviews page sidebar
 * Created: 2025-11-08
 */

'use client';

import React from 'react';
import styles from './ReviewStatsWidget.module.css';

interface Props {
  stats: {
    pendingCount: number;
    receivedCount: number;
    givenCount: number;
    averageRating: number;
  };
  averageRating: number;
}

export default function ReviewStatsWidget({ stats, averageRating }: Props) {
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <div className={styles.stars}>
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <span key={i} className={styles.starFilled}>★</span>;
          } else if (i === fullStars && hasHalfStar) {
            return <span key={i} className={styles.starHalf}>★</span>;
          } else {
            return <span key={i} className={styles.starEmpty}>★</span>;
          }
        })}
      </div>
    );
  };

  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>Your Stats</h3>

      {/* Average Rating */}
      <div className={styles.ratingSection}>
        <div className={styles.ratingValue}>{averageRating.toFixed(1)}</div>
        {renderStars(averageRating)}
        <p className={styles.ratingSubtext}>
          Based on {stats.receivedCount} {stats.receivedCount === 1 ? 'review' : 'reviews'}
        </p>
      </div>

      <div className={styles.divider} />

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{stats.pendingCount}</div>
          <div className={styles.statLabel}>Pending</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{stats.receivedCount}</div>
          <div className={styles.statLabel}>Received</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{stats.givenCount}</div>
          <div className={styles.statLabel}>Given</div>
        </div>
      </div>
    </div>
  );
}
