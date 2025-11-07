/**
 * Filename: apps/web/src/app/components/network/NetworkStatsWidget.tsx
 * Purpose: Network statistics widget for sidebar
 * Created: 2025-11-07
 */

'use client';

import React from 'react';
import type { Connection } from './ConnectionCard';
import styles from './NetworkStatsWidget.module.css';

interface NetworkStatsWidgetProps {
  stats: {
    total: number;
    pendingReceived: number;
    pendingSent: number;
  };
  connections: Connection[];
}

export default function NetworkStatsWidget({
  stats,
  connections,
}: NetworkStatsWidgetProps) {
  const newThisMonth = connections.filter(c => {
    const created = new Date(c.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() &&
           created.getFullYear() === now.getFullYear();
  }).length;

  return (
    <>
      {/* Stats Cards - Standard Hub Design */}
      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.total}</div>
          <div className={styles.statTitle}>Total Connections</div>
          <div className={styles.statSubtext}>Active network members</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.pendingReceived}</div>
          <div className={styles.statTitle}>Pending Requests</div>
          <div className={styles.statSubtext}>Awaiting your response</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.pendingSent}</div>
          <div className={styles.statTitle}>Sent Requests</div>
          <div className={styles.statSubtext}>Pending acceptance</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statNumber}>{newThisMonth}</div>
          <div className={styles.statTitle}>This Month</div>
          <div className={styles.statSubtext}>New connections</div>
        </div>
      </div>
    </>
  );
}
