'use client';

/**
 * Filename: GrowthHelpWidget.tsx
 * Purpose: Explains how the Growth Agent works in the sidebar
 * Pattern: Mirrors SageHelpWidget — indigo theme
 */

import React from 'react';
import HubComplexCard from '@/components/hub/sidebar/cards/HubComplexCard';
import styles from './GrowthHelpWidget.module.css';

export default function GrowthHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Growth Works</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Get personalised income and pricing advice based on your live metrics.
        </p>
        <p className={styles.text}>
          Ask about referrals, AI Tutor creation, listing optimisation, and business setup.
        </p>
        <p className={styles.text}>
          Role-adaptive: advice changes based on whether you&apos;re a tutor, agent, client, or organisation.
        </p>
      </div>
    </HubComplexCard>
  );
}
