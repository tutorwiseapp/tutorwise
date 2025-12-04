/**
 * Filename: MyStudentTipWidget.tsx
 * Purpose: My Students Hub Tip Widget
 * Created: 2025-12-03
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './MyStudentTipWidget.module.css';

export default function MyStudentTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Student Management Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Keep detailed notes about each student&apos;s progress and goals to provide personalized learning experiences.
        </p>
      </div>
    </HubComplexCard>
  );
}
