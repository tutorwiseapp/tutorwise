/**
 * Filename: AccountTipWidget.tsx
 * Purpose: Account Hub Tip Widget
 * Created: 2025-12-03
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AccountTipWidget.module.css';

export default function AccountTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Account Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Enable two-factor authentication in your security settings for enhanced account protection.
        </p>
      </div>
    </HubComplexCard>
  );
}
