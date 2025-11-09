/**
 * Filename: apps/web/src/app/components/network/NetworkSkeleton.tsx
 * Purpose: Loading skeleton for network page
 * Created: 2025-11-09
 */

import React from 'react';
import styles from './NetworkSkeleton.module.css';

interface NetworkSkeletonProps {
  count?: number;
}

export default function NetworkSkeleton({ count = 3 }: NetworkSkeletonProps) {
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
      </div>

      <div className={styles.connectionsList}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={styles.connectionCard}>
            <div className={styles.cardHeader}>
              <div className={styles.avatar} />
              <div className={styles.details}>
                <div className={styles.name} />
                <div className={styles.email} />
              </div>
            </div>
            <div className={styles.bio} />
            <div className={styles.actions}>
              <div className={styles.actionButton} />
              <div className={styles.actionButton} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
