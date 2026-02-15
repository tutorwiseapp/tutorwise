/**
 * Filename: VirtualSpaceHelpWidget.tsx
 * Purpose: VirtualSpace Hub Help Widget - explains how VirtualSpace works
 * Created: 2026-02-15
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about VirtualSpace features
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './VirtualSpaceHelpWidget.module.css';

export default function VirtualSpaceHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How VirtualSpace Works</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Create collaborative whiteboard sessions for tutoring or brainstorming.
        </p>
        <p className={styles.text}>
          Share sessions with invite links for real-time collaboration.
        </p>
        <p className={styles.text}>
          Standalone sessions expire after 24 hours of inactivity.
        </p>
      </div>
    </HubComplexCard>
  );
}
