/**
 * Filename: ReviewHelpWidget.tsx
 * Purpose: Reviews Hub Help Widget - explains how the review system works
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about review process
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ReviewHelpWidget.module.css';

export default function ReviewHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Reviews Work</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Receive reviews from students after completed sessions.
        </p>
        <p className={styles.text}>
          Build your reputation with positive feedback.
        </p>
        <p className={styles.text}>
          Respond to reviews professionally.
        </p>
      </div>
    </HubComplexCard>
  );
}
