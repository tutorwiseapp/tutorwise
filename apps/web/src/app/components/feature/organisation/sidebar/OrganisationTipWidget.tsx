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
          Invite team members to collaborate and manage bookings together.
        </p>
        <p className={styles.text}>
          Assign roles and permissions to control access levels.
        </p>
        <p className={styles.text}>
          Track organisation performance and team member activity.
        </p>
      </div>
    </HubComplexCard>
  );
}
