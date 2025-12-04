/**
 * Filename: OrganisationHelpWidget.tsx
 * Purpose: Organisation Hub Help Widget
 * Created: 2025-12-03
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './OrganisationHelpWidget.module.css';

export default function OrganisationHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Managing Your Organisation</h3>
      <div className={styles.content}>
        <ul className={styles.list}>
          <li className={styles.listItem}>
            Invite team members to collaborate and manage bookings together
          </li>
          <li className={styles.listItem}>
            Assign roles and permissions to control access levels
          </li>
          <li className={styles.listItem}>
            Track organisation performance and team member activity
          </li>
        </ul>
      </div>
    </HubComplexCard>
  );
}
