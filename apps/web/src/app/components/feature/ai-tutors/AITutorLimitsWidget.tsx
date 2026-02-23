/**
 * Filename: AITutorLimitsWidget.tsx
 * Purpose: AI Tutor Limits Widget - shows creation limits based on CaaS score
 * Created: 2026-02-23
 * Pattern: Uses HubComplexCard (matches BookingHelpWidget)
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AITutorLimitsWidget.module.css';

interface AITutorLimitsWidgetProps {
  current: number;
  limit: number;
  caasScore: number;
}

export default function AITutorLimitsWidget({
  current,
  limit,
  caasScore,
}: AITutorLimitsWidgetProps) {
  const percentage = (current / limit) * 100;

  return (
    <HubComplexCard>
      <h3 className={styles.title}>AI Tutor Limits</h3>
      <div className={styles.container}>
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className={styles.limitText}>
            {current} of {limit} AI tutors created
          </p>
        </div>
        <p className={styles.helpText}>
          Increase your CaaS score to create more AI tutors
        </p>
      </div>
    </HubComplexCard>
  );
}
