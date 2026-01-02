/**
 * Filename: ReferralHelpWidget.tsx
 * Purpose: Referral Program Help Widget
 * Created: 2026-01-02
 * Pattern: Follows OrganisationHelpWidget pattern using HubComplexCard
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './OrganisationHelpWidget.module.css'; // Reuse existing styles

interface ReferralHelpWidgetProps {
  isOwner?: boolean;
}

export default function ReferralHelpWidget({ isOwner = false }: ReferralHelpWidgetProps) {
  if (isOwner) {
    return (
      <HubComplexCard>
        <h3 className={styles.title}>Managing Referrals</h3>
        <div className={styles.content}>
          <p className={styles.text}>
            Configure commission rates and referral program settings in the Overview tab.
          </p>
          <p className={styles.text}>
            Track your team&apos;s referral pipeline from leads to converted clients.
          </p>
          <p className={styles.text}>
            Monitor team performance and export payout reports monthly.
          </p>
          <p className={styles.text}>
            Set up achievements and challenges to motivate your team.
          </p>
        </div>
      </HubComplexCard>
    );
  }

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Earning Referral Commissions</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Share your unique referral link with potential clients.
        </p>
        <p className={styles.text}>
          Track referrals through the conversion pipeline from lead to client.
        </p>
        <p className={styles.text}>
          Earn commissions when your referrals become paying clients.
        </p>
        <p className={styles.text}>
          Complete achievements and challenges to unlock bonus rewards.
        </p>
      </div>
    </HubComplexCard>
  );
}
