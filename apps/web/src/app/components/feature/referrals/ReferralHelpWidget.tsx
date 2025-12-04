/**
 * Filename: ReferralHelpWidget.tsx
 * Purpose: Referrals Hub Help Widget - explains how the referral program works
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about referral process
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ReferralHelpWidget.module.css';

export default function ReferralHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Referrals Work</h3>
      <div className={styles.content}>
        <ul className={styles.list}>
          <li className={styles.listItem}>
            Supply-side agent: Grow your earnings by inviting tutors with your link — earn 10% on every lesson they teach or product they sell.
          </li>
          <li className={styles.listItem}>
            Demand-side agent: Share your link or QR code in stores or WhatsApp to bring in new learners — earn 10% when referred clients book and pay.
          </li>
        </ul>
      </div>
    </HubComplexCard>
  );
}
