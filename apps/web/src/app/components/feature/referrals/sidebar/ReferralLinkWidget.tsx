/**
 * Filename: apps/web/src/app/components/feature/referrals/ReferralLinkWidget.tsx
 * Purpose: Display and copy referral link in sidebar
 * Created: 2025-12-04 (Moved from HubSidebar.tsx - Priority 2: Architecture cleanup)
 * Architecture: Feature-specific widget (Tier 3) - belongs in feature/referrals
 */

'use client';

import React from 'react';
import styles from './ReferralLinkWidget.module.css';

interface ReferralLinkWidgetProps {
  referralCode: string;
  onCopy: () => void;
}

export default function ReferralLinkWidget({
  referralCode,
  onCopy
}: ReferralLinkWidgetProps) {
  const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/a/${referralCode}`;

  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>Your Referral Link</h3>
      <div className={styles.widgetContent}>
        <div className={styles.referralLinkCard}>
          <div className={styles.referralUrl}>{referralUrl}</div>
          <button onClick={onCopy} className={styles.copyButton}>
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}
