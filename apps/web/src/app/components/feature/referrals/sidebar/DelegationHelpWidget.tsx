/**
 * Filename: DelegationHelpWidget.tsx
 * Purpose: Help widget for referral preferences sidebar
 * Created: 2025-12-18
 * Updated: 2025-12-18 - Match listing widgets pattern (no icons, hyperlinks)
 * Pattern: Uses HubComplexCard with teal header and text content
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DelegationHelpWidget.module.css';

export default function DelegationHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Delegation Works</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          <strong>Profile Default:</strong> Set a default partner for ALL your listings (Level 2 fallback).
        </p>
        <p className={styles.text}>
          <strong>Listing Override:</strong> Override specific listings for special partnerships (Level 1 highest precedence).
        </p>
        <p className={styles.text}>
          <strong>Third-Party Protection:</strong> If a third-party agent brought the client, they ALWAYS get commission (Level 0).
        </p>
        <a href="/help/delegation" className={styles.link}>
          View full guide →
        </a>
      </div>
    </HubComplexCard>
  );
}
