/**
 * Filename: EduPayVideoWidget.tsx
 * Purpose: EduPay Hub Video Widget — video tutorial about earning and converting EP
 * Created: 2026-02-10
 * Shell: HubComplexCard
 * Pattern: Copied from BookingVideoWidget
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './EduPayVideoWidget.module.css';

export default function EduPayVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorial</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Learn how to earn EP from tutoring sessions, referrals, and affiliate rewards — and how to convert EP to reduce your student loan.
        </p>
        <p className={styles.placeholder}>
          [Video content coming soon]
        </p>
      </div>
    </HubComplexCard>
  );
}
