/**
 * Filename: PaymentHelpWidget.tsx
 * Purpose: Payments Hub Info Widget
 * Created: 2025-11-18
 * Updated: 2025-11-18 - Changed to info widget (not stats)
 * Design: Uses HubComplexCard for simple info display
 *
 * Pattern: Title + Text content (no buttons/stats)
 * - Teal header
 * - Informational text about payment processing
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './PaymentHelpWidget.module.css';

export default function PaymentHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Payment Help</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          All payments are processed securely through Stripe.
        </p>
        <p className={styles.text}>
          For payment issues, contact our support team.
        </p>
      </div>
    </HubComplexCard>
  );
}
