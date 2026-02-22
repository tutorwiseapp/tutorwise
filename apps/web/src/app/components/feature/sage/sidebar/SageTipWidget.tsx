/**
 * Filename: SageTipWidget.tsx
 * Purpose: Sage Hub Tip Widget
 * Created: 2026-02-22
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './SageTipWidget.module.css';

export default function SageTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Sage Learning Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Ask specific questions for more accurate and detailed answers.
        </p>
        <p className={styles.text}>
          Use the OCR feature to scan homework problems and get instant help.
        </p>
        <p className={styles.text}>
          Upload study materials to build a personalized knowledge base.
        </p>
      </div>
    </HubComplexCard>
  );
}
