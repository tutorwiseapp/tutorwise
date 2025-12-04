/**
 * Filename: DisputeTipWidget.tsx
 * Purpose: Disputes Hub Tip Widget
 * Created: 2025-12-03
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DisputeTipWidget.module.css';

export default function DisputeTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Dispute Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Provide clear evidence and detailed descriptions when filing disputes to expedite resolution.
        </p>
      </div>
    </HubComplexCard>
  );
}
