/**
 * Filename: DelegationTipWidget.tsx
 * Purpose: Tip widget for referral preferences sidebar
 * Created: 2025-12-18
 * Updated: 2025-12-18 - Match listing widgets pattern (no icons, no buttons)
 * Pattern: Uses HubComplexCard with teal header
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DelegationTipWidget.module.css';

export default function DelegationTipWidget() {
  const tips = [
    "Set a profile default to automatically delegate all future listings.",
    "Override specific listings for special partnership arrangements.",
    "Clear overrides to revert back to your profile default.",
    "Third-party agents are always protected - they'll get commission if they brought the client.",
  ];

  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Pro Tip</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          {randomTip}
        </p>
      </div>
    </HubComplexCard>
  );
}
