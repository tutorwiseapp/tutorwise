/**
 * Filename: SageVideoWidget.tsx
 * Purpose: Sage Hub Video Widget
 * Created: 2026-02-22
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './SageVideoWidget.module.css';

export default function SageVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorial</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Learn how to get the most out of Sage AI Tutor.
        </p>
        <p className={styles.placeholder}>
          [Video content coming soon]
        </p>
      </div>
    </HubComplexCard>
  );
}
