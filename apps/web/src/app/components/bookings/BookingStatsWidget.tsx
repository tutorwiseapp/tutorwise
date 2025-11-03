/*
 * Filename: apps/web/src/app/components/bookings/BookingStatsWidget.tsx
 * Purpose: A widget for the ContextualSidebar showing booking stats
 * Created: 2025-11-03
 * Specification: Per user request in booking-hub-enhancement.md
 */
'use client';

import React from 'react';
import styles from './BookingStatsWidget.module.css';

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
    <div className={styles.statsWidget}>
      <h4 className={styles.title}>Booking Stats</h4>
      <ul className={styles.statList}>
        <li className={styles.statItem}>
          <span className={styles.statLabel}>Pending Confirmation</span>
          <strong className={styles.statValue}>{pending}</strong>
        </li>
        <li className={styles.statItem}>
          <span className={styles.statLabel}>Upcoming Sessions</span>
          <strong className={styles.statValue}>{upcoming}</strong>
        </li>
        <li className={styles.statItem}>
          <span className={styles.statLabel}>Completed Sessions</span>
          <strong className={styles.statValue}>{completed}</strong>
        </li>
      </ul>
    </div>
  );
};

export default BookingStatsWidget;
