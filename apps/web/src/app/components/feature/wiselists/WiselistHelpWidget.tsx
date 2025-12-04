/**
 * Filename: WiselistHelpWidget.tsx
 * Purpose: Wiselists Hub Help Widget - explains how wiselists work
 * Created: 2025-12-03
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + List content
 * - Teal header
 * - Informational text about wiselist features
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './WiselistHelpWidget.module.css';

export default function WiselistHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How Wiselists Work</h3>
      <div className={styles.content}>
        <ul className={styles.list}>
          <li className={styles.listItem}>
            Create collections of tutors for different subjects or needs
          </li>
          <li className={styles.listItem}>
            Save favorite tutors for easy access
          </li>
          <li className={styles.listItem}>
            Share lists with others
          </li>
        </ul>
      </div>
    </HubComplexCard>
  );
}
