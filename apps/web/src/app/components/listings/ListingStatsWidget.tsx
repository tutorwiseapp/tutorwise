/*
 * Filename: src/app/components/listings/ListingStatsWidget.tsx
 * Purpose: Display listing statistics in ContextualSidebar
 * Created: 2025-11-03
 * Specification: SDD v3.6 - ContextualSidebar widget with teal title box
 */
'use client';

import React, { useEffect, useState } from 'react';
import { getMyListings } from '@/lib/api/listings';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import type { Listing } from '@tutorwise/shared-types';
import styles from './ListingStatsWidget.module.css';

export default function ListingStatsWidget() {
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    archived: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const listings = await getMyListings();

        // Filter out templates and calculate stats
        const regularListings = listings.filter(l => !l.is_template);

        setStats({
          total: regularListings.length,
          published: regularListings.filter(l => l.status === 'published').length,
          drafts: regularListings.filter(l => l.status === 'draft').length,
          archived: regularListings.filter(l => l.status === 'archived').length,
        });
      } catch (error) {
        console.error('Failed to load listing stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

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
