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
            Share your unique referral link with tutors or clients
          </li>
          <li className={styles.listItem}>
            Earn 10% commission on their first paid booking
          </li>
          <li className={styles.listItem}>
            Track all referrals in your dashboard
          </li>
        </ul>
      </div>
    </HubComplexCard>
  );
}
