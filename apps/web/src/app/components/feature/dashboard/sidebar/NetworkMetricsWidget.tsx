/**
 * Filename: NetworkMetricsWidget.tsx
 * Purpose: Dashboard widget displaying network connection metrics and growth
 * Created: 2026-02-08
 * Network Audit Enhancement: Add analytics dashboard (Option A - Hub Dashboard)
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import styles from './NetworkMetricsWidget.module.css';

interface NetworkMetrics {
  totalConnections: number;
  pendingReceived: number;
  pendingSent: number;
  weeklyGrowth: number;
  weeklyGrowthPercent: number;
}

export default function NetworkMetricsWidget({ userId }: { userId: string }) {
  // Fetch network metrics
  const { data: metrics, isLoading } = useQuery<NetworkMetrics>({
    queryKey: ['network-metrics', userId],
    queryFn: async () => {
      const response = await fetch('/api/network/metrics');
      if (!response.ok) throw new Error('Failed to fetch network metrics');
      return response.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <div className={styles.widget}>
        <div className={styles.header}>
          <h3 className={styles.title}>Network</h3>
        </div>
        <div className={styles.loading}>Loading metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const { totalConnections, pendingReceived, pendingSent, weeklyGrowth, weeklyGrowthPercent } = metrics;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>Network</h3>
        <Link href="/network" className={styles.viewAll}>
          View All →
        </Link>
      </div>

      <div className={styles.content}>
        {/* Total Connections */}
        <div className={styles.metric}>
          <div className={styles.metricValue}>{totalConnections}</div>
          <div className={styles.metricLabel}>Total Connections</div>
          {weeklyGrowth > 0 && (
            <div className={styles.growth}>
              <span className={styles.growthIndicator}>↗</span>
              <span className={styles.growthText}>
                +{weeklyGrowth} this week ({weeklyGrowthPercent > 0 ? `+${weeklyGrowthPercent.toFixed(1)}` : '0'}%)
              </span>
            </div>
          )}
        </div>

        {/* Pending Requests */}
        {(pendingReceived > 0 || pendingSent > 0) && (
          <div className={styles.pendingSection}>
            <div className={styles.pendingLabel}>Pending</div>
            <div className={styles.pendingGrid}>
              {pendingReceived > 0 && (
                <Link href="/network?tab=pending-received" className={styles.pendingItem}>
                  <span className={styles.pendingCount}>{pendingReceived}</span>
                  <span className={styles.pendingText}>Received</span>
                </Link>
              )}
              {pendingSent > 0 && (
                <Link href="/network?tab=pending-sent" className={styles.pendingItem}>
                  <span className={styles.pendingCount}>{pendingSent}</span>
                  <span className={styles.pendingText}>Sent</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalConnections === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              Build your professional network by connecting with tutors, clients, and agents.
            </p>
            <Link href="/marketplace" className={styles.exploreLink}>
              Explore Marketplace →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
