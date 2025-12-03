/**
 * Filename: apps/web/src/app/components/feature/network/QuickActionsWidget.tsx
 * Purpose: Quick actions widget for Network page sidebar
 * Created: 2025-11-07
 */

'use client';

import React from 'react';
import styles from './QuickActionsWidget.module.css';

interface QuickActionsWidgetProps {
  onConnect: () => void;
}

export default function QuickActionsWidget({ onConnect }: QuickActionsWidgetProps) {
  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>Quick Actions</h3>
      <div className={styles.actions}>
        <button onClick={onConnect} className={styles.primaryButton}>
          Add Connection
        </button>
        <div className={styles.secondaryActions}>
          <button className={styles.secondaryButton} title="Coming soon">
            Find People
          </button>
          <button className={styles.secondaryButton} title="Coming soon">
            Invite by Email
          </button>
        </div>
      </div>
    </div>
  );
}
