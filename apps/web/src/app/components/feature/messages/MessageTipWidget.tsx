/**
 * Filename: MessageTipWidget.tsx
 * Purpose: Messages Hub Tip Widget - provides helpful tips for effective messaging
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content (placeholder for now)
 * - Teal header
 * - Placeholder tip content
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './MessageTipWidget.module.css';

export default function MessageTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Message Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Respond to messages within 24 hours to maintain good communication with your contacts.
        </p>
      </div>
    </HubComplexCard>
  );
}
