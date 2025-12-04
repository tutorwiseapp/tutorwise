/**
 * Filename: MessageVideoWidget.tsx
 * Purpose: Messages Hub Video Widget - video tutorial about messaging system
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
import styles from './MessageVideoWidget.module.css';

export default function MessageVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorial</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Learn how to effectively communicate through our messaging system.
        </p>
        <p className={styles.placeholder}>
          [Video content coming soon]
        </p>
      </div>
    </HubComplexCard>
  );
}
