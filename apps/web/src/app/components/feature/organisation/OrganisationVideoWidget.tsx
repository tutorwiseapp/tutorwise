/**
 * Filename: OrganisationVideoWidget.tsx
 * Purpose: Organisation Hub Video Widget
 * Created: 2025-12-03
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './OrganisationVideoWidget.module.css';

export default function OrganisationVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorial</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Learn how to set up and manage your organisation effectively.
        </p>
        <p className={styles.placeholder}>
          [Video content coming soon]
        </p>
      </div>
    </HubComplexCard>
  );
}
