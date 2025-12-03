/**
 * Filename: ReferralTipWidget.tsx
 * Purpose: Referrals Hub Tip Widget - provides helpful tips for maximizing referrals
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
import styles from './ReferralTipWidget.module.css';

export default function ReferralTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Referral Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Share your referral link on social media to reach more people and increase your earnings.
        </p>
      </div>
    </HubComplexCard>
  );
}
