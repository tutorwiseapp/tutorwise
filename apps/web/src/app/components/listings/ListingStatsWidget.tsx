/*
 * Filename: src/app/components/listings/ListingStatsWidget.tsx
 * Purpose: Display listing statistics in ContextualSidebar
 * Created: 2025-11-03
 * Specification: SDD v3.6 - ContextualSidebar widget with teal title box
 *
 * FIXED: Race condition where independent data fetching caused cards to disappear
 * Now receives listings as props from parent page for consistent state management
 */
'use client';

import React, { useMemo } from 'react';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import type { Listing } from '@tutorwise/shared-types';
import styles from './ListingStatsWidget.module.css';

interface ListingStatsWidgetProps {
  listings: Listing[];
  isLoading: boolean;
}

export default function ListingStatsWidget({ listings, isLoading }: ListingStatsWidgetProps) {
  // Calculate stats from props - use useMemo to avoid recalculation on every render
  const stats = useMemo(() => {
    // Filter out templates and calculate stats
    const regularListings = listings.filter(l => !l.is_template);

    return {
      total: regularListings.length,
      published: regularListings.filter(l => l.status === 'published').length,
      unpublished: regularListings.filter(l => l.status === 'unpublished').length,
      drafts: regularListings.filter(l => l.status === 'draft').length,
      archived: regularListings.filter(l => l.status === 'archived').length,
    };
  }, [listings]);

  if (isLoading) {
    return (
      <SidebarWidget title="Listing Stats">
        <p className={styles.loading}>Loading...</p>
      </SidebarWidget>
    );
  }

  return (
    <SidebarWidget title="Listing Stats">
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.published}</div>
          <div className={styles.statLabel}>Published</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.unpublished}</div>
          <div className={styles.statLabel}>Unpublished</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.drafts}</div>
          <div className={styles.statLabel}>Drafts</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.archived}</div>
          <div className={styles.statLabel}>Archived</div>
        </div>
      </div>
    </SidebarWidget>
  );
}
