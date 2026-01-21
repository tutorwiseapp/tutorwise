/**
 * Filename: ListingsTipWidget.tsx
 * Purpose: Tips widget for create listing sidebar
 * Created: 2026-01-19
 * Updated: 2026-01-19 - Migrated to HubComplexCard design pattern
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content
 * - Teal header
 * - Simple tip text
 */
'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ListingsTipWidget.module.css';

export default function ListingsTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Listing Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Add detailed descriptions and clear pricing to attract more students to your listings.
        </p>
      </div>
    </HubComplexCard>
  );
}
