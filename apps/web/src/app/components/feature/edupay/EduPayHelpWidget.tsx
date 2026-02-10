/**
 * Filename: EduPayHelpWidget.tsx
 * Purpose: EduPay help/explainer sidebar widget
 * Created: 2026-02-10
 * Shell: HubComplexCard
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './EduPayHelpWidget.module.css';

export default function EduPayHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>What is EduPay?</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          EduPay converts your tutoring activity into real financial impact on your student loan.
        </p>
        <ul className={styles.list}>
          <li className={styles.listItem}>Earn EP from sessions, referrals &amp; rewards</li>
          <li className={styles.listItem}>See your projected loan reduction</li>
          <li className={styles.listItem}>Convert EP to loan payments (Phase 2)</li>
        </ul>
      </div>
    </HubComplexCard>
  );
}
