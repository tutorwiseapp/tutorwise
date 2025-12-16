/**
 * Filename: apps/web/src/app/components/feature/reviews/ReviewStatsWidget.tsx
 * Purpose: Stats widget for Reviews page sidebar
 * Created: 2025-11-08
 * Updated: 2025-11-19 - Migrated to v2 design with HubStatsCard
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ReviewStatsWidget.module.css';

interface Props {
  stats: {
    pendingCount: number;
    urgentCount?: number; // Reviews with ≤1 day remaining
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

  const statsData: StatRow[] = [
    {
      label: 'Pending Reviews',
      value: stats.pendingCount,
      valueColor: stats.pendingCount > 0 ? 'orange' : 'default',
    },
    // Show urgent reviews if there are any
    ...(stats.urgentCount && stats.urgentCount > 0 ? [{
      label: 'Urgent (≤1 day)',
      value: stats.urgentCount,
      valueColor: 'red' as const,
    }] : []),
    {
      label: 'Reviews Received',
      value: stats.receivedCount,
      valueColor: 'default',
    },
    {
      label: 'Reviews Given',
      value: stats.givenCount,
      valueColor: 'default',
    },
  ];

  return (
    <>
      {/* Average Rating Widget */}
      <HubComplexCard>
        <h3 className={styles.title}>Average Rating</h3>
        <div className={styles.ratingSection}>
          <div className={styles.ratingValue}>{averageRating.toFixed(1)}</div>
          {renderStars(averageRating)}
          <p className={styles.ratingSubtext}>
            Based on {stats.receivedCount} {stats.receivedCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </HubComplexCard>

      {/* Stats Widget */}
      <HubStatsCard title="Your Stats" stats={statsData} />
    </>
  );
}
