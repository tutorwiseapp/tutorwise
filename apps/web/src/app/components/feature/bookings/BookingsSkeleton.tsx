/**
 * Filename: apps/web/src/app/components/feature/bookings/BookingsSkeleton.tsx
 * Purpose: Loading skeleton for bookings page
 * Created: 2025-11-08
 */

import React from 'react';
import styles from './BookingsSkeleton.module.css';

interface BookingsSkeletonProps {
  count?: number;
}

export default function BookingsSkeleton({ count = 3 }: BookingsSkeletonProps) {
  return (
    <div className={styles.container}>
      {/* Header Skeleton */}
      <div className={styles.header}>
        <div className={styles.titleSkeleton} />
        <div className={styles.subtitleSkeleton} />
      </div>

      {/* Filter Tabs Skeleton */}
      <div className={styles.filterSkeleton}>
        <div className={styles.filterTab} />
        <div className={styles.filterTab} />
        <div className={styles.filterTab} />
      </div>

      {/* Bookings List Skeleton */}
      <div className={styles.bookingsList}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={styles.bookingCard}>
            <div className={styles.bookingHeader}>
              <div className={styles.serviceName} />
              <div className={styles.status} />
            </div>
            <div className={styles.bookingDetails}>
              <div className={styles.detail} />
              <div className={styles.detail} />
              <div className={styles.detail} />
            </div>
            <div className={styles.bookingFooter}>
              <div className={styles.amount} />
              <div className={styles.button} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
