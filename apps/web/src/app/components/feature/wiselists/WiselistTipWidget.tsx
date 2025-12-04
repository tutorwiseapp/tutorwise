/**
 * Filename: WiselistTipWidget.tsx
 * Purpose: Wiselists Hub Tip Widget - provides helpful tips for managing wiselists
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
import styles from './WiselistTipWidget.module.css';

export default function WiselistTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Wiselist Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Organize tutors into subject-specific lists to quickly find the right tutor for each topic.
        </p>
      </div>
    </HubComplexCard>
  );
}
