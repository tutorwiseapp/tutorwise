/**
 * Filename: VirtualSpaceTipWidget.tsx
 * Purpose: VirtualSpace Hub Tip Widget - provides helpful tips
 * Created: 2026-02-15
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content
 * - Teal header
 * - Tip content
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './VirtualSpaceTipWidget.module.css';

export default function VirtualSpaceTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>VirtualSpace Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Use the whiteboard to visualize concepts during tutoring sessions. Draw diagrams, write equations, and collaborate in real-time.
        </p>
      </div>
    </HubComplexCard>
  );
}
