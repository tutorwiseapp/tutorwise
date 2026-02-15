/**
 * Filename: VirtualSpaceSkeleton.tsx
 * Purpose: Loading skeleton for VirtualSpace sessions page
 * Created: 2026-02-15
 * Pattern: Grid of session card skeletons matching page layout
 */

import React from 'react';
import styles from './VirtualSpaceSkeleton.module.css';

interface VirtualSpaceSkeletonProps {
  count?: number;
}

export default function VirtualSpaceSkeleton({ count = 6 }: VirtualSpaceSkeletonProps) {
  return (
    <div className={styles.container}>
      {/* Sessions Grid Skeleton */}
      <div className={styles.sessionsGrid}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={styles.sessionCard}>
            <div className={styles.cardHeader}>
              <div className={styles.titleSkeleton} />
              <div className={styles.badgeSkeleton} />
            </div>
            <div className={styles.metaSkeleton}>
              <div className={styles.metaItem} />
              <div className={styles.metaItem} />
            </div>
            <div className={styles.actionsSkeleton}>
              <div className={styles.buttonSkeleton} />
              <div className={styles.smallButtonSkeleton} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
