/**
 * Filename: DashboardHelpWidget.tsx
 * Purpose: Dashboard Hub Help Widget
 * Created: 2025-12-17
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DashboardHelpWidget.module.css';

export default function DashboardHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Getting Started</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Your dashboard provides an overview of your activity and performance.
        </p>
        <p className={styles.text}>
          Use the navigation menu to access different areas of your account.
        </p>
      </div>
    </HubComplexCard>
  );
}
