/**
 * Filename: AITutorLimitsWidget.tsx
 * Purpose: AI Tutor Limits Widget - shows creation limits based on CaaS score
 * Created: 2026-02-23
 * Pattern: Uses HubComplexCard (matches BookingHelpWidget)
 */

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AITutorLimitsWidget.module.css';

export default function AITutorLimitsWidget() {
  const { data: limits } = useQuery({
    queryKey: ['ai-tutor-limits'],
    queryFn: async () => {
      const res = await fetch('/api/ai-agents/limits');
      if (!res.ok) return { current: 0, limit: 1, caasScore: 0 };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const current = limits?.current ?? 0;
  const limit = limits?.limit ?? 1;
  const percentage = limit > 0 ? (current / limit) * 100 : 0;

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
