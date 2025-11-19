/**
 * Filename: apps/web/src/app/components/reviews/ReviewStatsWidget.tsx
 * Purpose: Stats widget for Reviews page sidebar
 * Created: 2025-11-08
 * Updated: 2025-11-19 - Migrated to v2 design with SidebarStatsWidget
 */

'use client';

import React from 'react';
import SidebarStatsWidget, { StatRow } from '@/app/components/layout/sidebars/components/SidebarStatsWidget';
import SidebarComplexWidget from '@/app/components/layout/sidebars/components/SidebarComplexWidget';
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

  const statsData: StatRow[] = [
    {
      label: 'Pending Reviews',
      value: stats.pendingCount,
      valueColor: stats.pendingCount > 0 ? 'orange' : 'default',
    },
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
      <SidebarComplexWidget>
        <h3 className={styles.title}>Average Rating</h3>
        <div className={styles.ratingSection}>
          <div className={styles.ratingValue}>{averageRating.toFixed(1)}</div>
          {renderStars(averageRating)}
          <p className={styles.ratingSubtext}>
            Based on {stats.receivedCount} {stats.receivedCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </SidebarComplexWidget>

      {/* Stats Widget */}
      <SidebarStatsWidget title="Your Stats" stats={statsData} />
    </>
  );
}
