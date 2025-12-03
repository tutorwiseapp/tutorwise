/**
 * Filename: PaymentTipWidget.tsx
 * Purpose: Payments Hub Tip Widget - provides helpful tips for managing payment methods
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content
 * - Teal header
 * - Tip content
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './PaymentTipWidget.module.css';

export default function PaymentTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Payment Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Keep your payment method up to date to ensure uninterrupted service for your bookings.
        </p>
      </div>
    </HubComplexCard>
  );
}
