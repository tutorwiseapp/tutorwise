/**
 * Filename: DelegationVideoWidget.tsx
 * Purpose: Video tutorial widget for referral preferences sidebar
 * Created: 2025-12-18
 * Updated: 2025-12-18 - Match listing widgets pattern (no icons, hyperlinks)
 * Pattern: Uses HubComplexCard with teal header
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DelegationVideoWidget.module.css';

export default function DelegationVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorial</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Watch a 3-minute walkthrough on setting up partnership programs with hierarchical delegation.
        </p>
        <a href="/tutorials/delegation" className={styles.link}>
          Watch now →
        </a>
      </div>
    </HubComplexCard>
  );
}
