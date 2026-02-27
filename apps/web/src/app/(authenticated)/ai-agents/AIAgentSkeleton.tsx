/**
 * Filename: AIAgentSkeleton.tsx
 * Purpose: Loading skeleton for AI Tutor cards (matches ListingsSkeleton pattern)
 * Created: 2026-02-24
 */

import React from 'react';
import styles from './AIAgentSkeleton.module.css';

export default function AIAgentSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonAvatar} />
        <div className={styles.skeletonContent}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonSubtitle} />
        </div>
        <div className={styles.skeletonBadge} />
      </div>
      <div className={styles.skeletonDetails}>
        <div className={styles.skeletonDetail} />
        <div className={styles.skeletonDetail} />
        <div className={styles.skeletonDetail} />
        <div className={styles.skeletonDetail} />
      </div>
      <div className={styles.skeletonActions}>
        <div className={styles.skeletonButton} />
        <div className={styles.skeletonButton} />
        <div className={styles.skeletonButton} />
      </div>
    </div>
  );
}
