/**
 * Filename: MyStudentHelpWidget.tsx
 * Purpose: My Students Hub Help Widget
 * Created: 2025-12-03
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './MyStudentHelpWidget.module.css';

export default function MyStudentHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Managing Your Students</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Add students to track their progress and bookings.
        </p>
        <p className={styles.text}>
          Invite students to join Tutorwise for easier scheduling.
        </p>
        <p className={styles.text}>
          View all bookings and sessions for each student.
        </p>
      </div>
    </HubComplexCard>
  );
}
