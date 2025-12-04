/**
 * Filename: NetworkTipWidget.tsx
 * Purpose: Network Hub Tip Widget - provides helpful tips for networking
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
import styles from './NetworkTipWidget.module.css';

export default function NetworkTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Network Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Actively engage with your connections to build meaningful professional relationships.
        </p>
      </div>
    </HubComplexCard>
  );
}
