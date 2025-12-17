/**
 * Filename: OrganisationHelpWidget.tsx
 * Purpose: Organisation Hub Help Widget
 * Created: 2025-12-03
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './OrganisationHelpWidget.module.css';

interface OrganisationHelpWidgetProps {
  onSubscribeClick?: () => void;
}

export default function OrganisationHelpWidget({ onSubscribeClick }: OrganisationHelpWidgetProps) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Managing Your Organisation</h3>
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
        <p className={styles.trialNotice}>
          Premium subscription service with a 14-day free trial period.{' '}
          <button
            onClick={onSubscribeClick}
            className={styles.subscribeLink}
            type="button"
          >
            Subscribe Now
          </button>
        </p>
      </div>
    </HubComplexCard>
  );
}
