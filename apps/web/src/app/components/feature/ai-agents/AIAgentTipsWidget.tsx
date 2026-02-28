/**
 * Filename: AIAgentTipsWidget.tsx
 * Purpose: AI Tutor Tips Widget - provides helpful tips for creators
 * Created: 2026-02-23
 * Pattern: Uses HubComplexCard (matches BookingTipWidget)
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AIAgentTipsWidget.module.css';

export default function AIAgentTipsWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>AI Tutor Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Upload comprehensive teaching materials for better AI responses.
        </p>
        <p className={styles.text}>
          Set competitive pricing (£5-15/hour recommended for new AI tutors).
        </p>
        <p className={styles.text}>
          Add high-priority URL links to official documentation and trusted resources.
        </p>
        <p className={styles.text}>
          Monitor session feedback to identify knowledge gaps and improve materials.
        </p>
        <p className={styles.text}>
          Earn 90% of session revenue - the more students use your AI tutor, the more you earn!
        </p>
      </div>
    </HubComplexCard>
  );
}
