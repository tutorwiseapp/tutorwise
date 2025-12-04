/**
 * Filename: ListingHelpWidget.tsx
 * Purpose: Listings Hub Help Widget - explains how listings work
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about listing process
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ListingHelpWidget.module.css';

export default function ListingHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Listings Work</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Create listings to showcase your tutoring services.
        </p>
        <p className={styles.text}>
          Set your availability, pricing, and session details.
        </p>
        <p className={styles.text}>
          Publish listings to attract students.
        </p>
      </div>
    </HubComplexCard>
  );
}
