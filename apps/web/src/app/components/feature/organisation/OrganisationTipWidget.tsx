/**
 * Filename: OrganisationTipWidget.tsx
 * Purpose: Organisation Hub Tip Widget
 * Created: 2025-12-03
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './OrganisationTipWidget.module.css';

export default function OrganisationTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Organisation Tips</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Set clear roles and responsibilities for team members to streamline operations and avoid conflicts.
        </p>
      </div>
    </HubComplexCard>
  );
}
