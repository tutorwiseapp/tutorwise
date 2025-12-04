/**
 * Filename: ReviewTipWidget.tsx
 * Purpose: Reviews Hub Tip Widget - provides helpful tips for managing reviews
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content (placeholder for now)
 * - Teal header
 * - Tip content
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ReviewTipWidget.module.css';

export default function ReviewTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Review Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Encourage satisfied students to leave reviews to build your credibility and attract more bookings.
        </p>
      </div>
    </HubComplexCard>
  );
}
