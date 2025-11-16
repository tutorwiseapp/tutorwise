/**
 * Filename: WiselistStatsWidget.tsx
 * Purpose: Display wiselist statistics in sidebar (v5.7)
 * Path: /app/components/wiselists/WiselistStatsWidget.tsx
 * Created: 2025-11-15
 */

'use client';

import React, { useEffect, useState } from 'react';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import styles from '@/app/components/layout/sidebars/ContextualSidebar.module.css';

interface WiselistStats {
  total_wiselists: number;
  public_wiselists: number;
  total_items: number;
  total_collaborators: number;
}

export function WiselistStatsWidget() {
  const [stats, setStats] = useState<WiselistStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/wiselists');
      if (!response.ok) throw new Error('Failed to fetch wiselists');

      const { wiselists } = await response.json();

      // Calculate stats
      const stats: WiselistStats = {
        total_wiselists: wiselists.length,
        public_wiselists: wiselists.filter((w: any) => w.visibility === 'public').length,
        total_items: wiselists.reduce((sum: number, w: any) => sum + (w.item_count || 0), 0),
        total_collaborators: wiselists.reduce((sum: number, w: any) => sum + (w.collaborator_count || 0), 0),
      };

      setStats(stats);
    } catch (error) {
      console.error('Fetch wiselist stats error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarWidget title="Your Wiselists">
        <div className={styles.widgetContent}>
          <p className={styles.widgetText}>Loading...</p>
        </div>
      </SidebarWidget>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <SidebarWidget title="Your Wiselists">
      <div className={styles.widgetContent}>
        {stats.total_wiselists === 0 ? (
          <p className={styles.widgetText}>
            Create your first wiselist to start organizing your favorite tutors and services!
          </p>
        ) : (
          <div className={styles.statsCard}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>
                {stats.total_wiselists === 1 ? 'Wiselist' : 'Wiselists'}
              </span>
              <span className={styles.statValue}>{stats.total_wiselists}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Public</span>
              <span className={styles.statValue}>{stats.public_wiselists}</span>
            </div>
            {stats.total_items > 0 && (
              <div className={styles.statRow}>
                <span className={styles.statLabel}>
                  {stats.total_items === 1 ? 'Item' : 'Items'}
                </span>
                <span className={styles.statValue}>{stats.total_items}</span>
              </div>
            )}
            {stats.total_collaborators > 0 && (
              <div className={styles.statRow}>
                <span className={styles.statLabel}>
                  {stats.total_collaborators === 1 ? 'Collaborator' : 'Collaborators'}
                </span>
                <span className={styles.statValue}>{stats.total_collaborators}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarWidget>
  );
}
