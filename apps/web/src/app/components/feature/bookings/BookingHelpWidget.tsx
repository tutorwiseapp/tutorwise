/**
 * Filename: BookingHelpWidget.tsx
 * Purpose: Bookings Hub Help Widget - explains how bookings work
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about booking process
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './BookingHelpWidget.module.css';

export default function BookingHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Bookings Work</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          View and manage all your upcoming and past bookings.
        </p>
        <p className={styles.text}>
          Track booking status from confirmed to completed.
        </p>
        <p className={styles.text}>
          Communicate with clients through booking details.
        </p>
      </div>
    </HubComplexCard>
  );
}
