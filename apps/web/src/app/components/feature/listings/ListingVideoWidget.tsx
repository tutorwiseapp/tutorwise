/**
 * Filename: ListingVideoWidget.tsx
 * Purpose: Listings Hub Video Widget - video tutorial about creating listings
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content (placeholder for now)
 * - Teal header
 * - Placeholder video content
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ListingVideoWidget.module.css';

export default function ListingVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorial</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Learn how to create effective listings that attract students.
        </p>
        <p className={styles.placeholder}>
          [Video content coming soon]
        </p>
      </div>
    </HubComplexCard>
  );
}
