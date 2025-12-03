/**
 * Filename: BookingTipWidget.tsx
 * Purpose: Bookings Hub Tip Widget - provides helpful tips for managing bookings
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content (placeholder for now)
 * - Teal header
 * - Placeholder tip content
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './BookingTipWidget.module.css';

export default function BookingTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Booking Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Confirm bookings promptly to maintain high response rates and build trust with clients.
        </p>
      </div>
    </HubComplexCard>
  );
}
