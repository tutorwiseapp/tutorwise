/**
 * Filename: apps/web/src/app/components/feature/edupay/EduPaySkeleton.tsx
 * Purpose: Loading skeleton for EduPay pages (Wallet, Cashback, Savings)
 * Created: 2026-02-12
 * Pattern: Gold Standard Hub Architecture (matches BookingsSkeleton)
 */

import React from 'react';
import styles from './EduPaySkeleton.module.css';

interface EduPaySkeletonProps {
  count?: number;
  variant?: 'wallet' | 'cashback' | 'savings';
}

export default function EduPaySkeleton({ count = 3, variant = 'wallet' }: EduPaySkeletonProps) {
  return (
    <div className={styles.container}>
      {/* Header Skeleton */}
      <div className={styles.header}>
        <div className={styles.titleSkeleton} />
        <div className={styles.filtersSkeleton}>
          <div className={styles.searchSkeleton} />
          <div className={styles.selectSkeleton} />
          <div className={styles.selectSkeleton} />
          {variant !== 'wallet' && <div className={styles.selectSkeleton} />}
        </div>
      </div>

      {/* Filter Tabs Skeleton */}
      <div className={styles.tabsSkeleton}>
        <div className={styles.tab} />
        <div className={styles.tab} />
        <div className={styles.tab} />
        {variant === 'wallet' && <div className={styles.tab} />}
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.ledgerList}>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className={styles.ledgerCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIcon} />
                  <div className={styles.cardInfo}>
                    <div className={styles.cardTitle} />
                    <div className={styles.cardSubtitle} />
                  </div>
                </div>
                <div className={styles.cardAmount}>
                  <div className={styles.epAmount} />
                  <div className={styles.gbpAmount} />
                </div>
                <div className={styles.cardFooter}>
                  <div className={styles.statusBadge} />
                  <div className={styles.dateBadge} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className={styles.sidebar}>
          <div className={styles.widget}>
            <div className={styles.widgetTitle} />
            <div className={styles.widgetValue} />
            <div className={styles.widgetRow} />
            <div className={styles.widgetRow} />
          </div>
          <div className={styles.widget}>
            <div className={styles.widgetTitle} />
            <div className={styles.widgetContent} />
          </div>
          <div className={styles.widget}>
            <div className={styles.widgetTitle} />
            <div className={styles.widgetContent} />
          </div>
        </div>
      </div>
    </div>
  );
}
