/**
 * Filename: AITutorVideoWidget.tsx
 * Purpose: AI Tutor Video Widget - links to tutorial video
 * Created: 2026-02-23
 * Pattern: Uses HubComplexCard (matches BookingVideoWidget)
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AITutorVideoWidget.module.css';

export default function AITutorVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Getting Started Video</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Need help scheduling or managing bookings?
        </p>
        <p className={styles.text}>
          Learn how to create your first AI tutor, upload materials, and start earning passive income.
        </p>
        <a href="#" className={styles.videoLink}>
          Watch tutorial video →
        </a>
      </div>
    </HubComplexCard>
  );
}
