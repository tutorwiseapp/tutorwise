'use client';

/**
 * Sage Help Widget
 *
 * Explains how Sage works in the sidebar.
 *
 * @module components/feature/sage/widgets/SageHelpWidget
 */

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './SageHelpWidget.module.css';

export default function SageHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Sage Works</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Ask questions and get step-by-step explanations.
        </p>
        <p className={styles.text}>
          Practice with personalised questions and feedback.
        </p>
        <p className={styles.text}>
          Track your progress across all subjects.
        </p>
      </div>
    </HubComplexCard>
  );
}
