/**
 * Filename: VirtualSpaceVideoWidget.tsx
 * Purpose: VirtualSpace Hub Video Widget - video tutorial about using VirtualSpace
 * Created: 2026-02-15
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content (placeholder for now)
 * - Teal header
 * - Video content placeholder
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './VirtualSpaceVideoWidget.module.css';

export default function VirtualSpaceVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorial</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Learn how to use the whiteboard and collaborate in real-time with your tutoring sessions.
        </p>
        <p className={styles.placeholder}>
          [Video content coming soon]
        </p>
      </div>
    </HubComplexCard>
  );
}
