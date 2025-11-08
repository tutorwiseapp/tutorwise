/**
 * Filename: apps/web/src/app/components/listings/ListingsSkeleton.tsx
 * Purpose: Loading skeleton for listings page
 * Created: 2025-11-08
 */

import React from 'react';
import styles from './ListingsSkeleton.module.css';

interface ListingsSkeletonProps {
  count?: number;
}

export default function ListingsSkeleton({ count = 3 }: ListingsSkeletonProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSkeleton} />
        <div className={styles.subtitleSkeleton} />
      </div>

      <div className={styles.filterSkeleton} />

      <div className={styles.listingsList}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={styles.listingCard}>
            <div className={styles.cardHeader}>
              <div className={styles.titleLine} />
              <div className={styles.badgeSkeleton} />
            </div>
            <div className={styles.cardContent}>
              <div className={styles.line} />
              <div className={styles.line} />
              <div className={styles.lineShort} />
            </div>
            <div className={styles.cardActions}>
              <div className={styles.buttonSkeleton} />
              <div className={styles.buttonSkeleton} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
