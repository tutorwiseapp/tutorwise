/*
 * Filename: apps/web/src/app/components/bookings/BookingStatsWidget.tsx
 * Purpose: A widget for the ContextualSidebar showing booking stats
 * Created: 2025-11-03
 * Updated: 2025-11-03 - Refactored to use standard SidebarWidget styling
 * Specification: Per user request - match ReferralStatsWidget/BalanceSummaryWidget style
 */
'use client';

import React from 'react';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import styles from '@/app/components/layout/sidebars/ContextualSidebar.module.css';

interface BookingStatsWidgetProps {
  pending?: number;
  upcoming?: number;
  completed?: number;
}

export const BookingStatsWidget: React.FC<BookingStatsWidgetProps> = ({
  pending = 0,
  upcoming = 0,
  completed = 0,
}) => {
  return (
    <SidebarWidget title="Booking Stats">
      <div className={styles.statsCard}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Pending Confirmation:</span>
          <span className={styles.statValue}>{pending}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Upcoming Sessions:</span>
          <span className={styles.statValue}>{upcoming}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Completed Sessions:</span>
          <span className={styles.statValue}>{completed}</span>
        </div>
      </div>
    </SidebarWidget>
  );
};

export default BookingStatsWidget;
