/**
 * Filename: MessageHelpWidget.tsx
 * Purpose: Messages Hub Help Widget - explains how the messaging system works
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about messaging process
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './MessageHelpWidget.module.css';

export default function MessageHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Messages Work</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Send and receive messages with students and tutors.
        </p>
        <p className={styles.text}>
          All conversations are organized by contact.
        </p>
        <p className={styles.text}>
          Get notifications for new messages.
        </p>
      </div>
    </HubComplexCard>
  );
}
