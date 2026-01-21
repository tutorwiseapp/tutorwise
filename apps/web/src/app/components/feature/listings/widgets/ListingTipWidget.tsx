/**
 * Filename: ListingTipWidget.tsx
 * Purpose: Listings Hub Tip Widget - provides helpful tips for maximizing listings
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
import styles from './ListingTipWidget.module.css';

export default function ListingTipWidget() {
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
