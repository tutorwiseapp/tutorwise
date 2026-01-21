/**
 * Filename: ListingsVideoWidget.tsx
 * Purpose: Video tutorial widget for create listing sidebar
 * Created: 2026-01-19
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content (placeholder for now)
 * - Teal header
 * - Placeholder video content
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ListingsVideoWidget.module.css';

export default function ListingsVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorial</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Learn how to create effective listings that attract students.
        </p>
        <p className={styles.placeholder}>
          [video content coming soon]
        </p>
      </div>
    </HubComplexCard>
  );
}
