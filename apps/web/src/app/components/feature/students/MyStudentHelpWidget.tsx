/**
 * Filename: MyStudentHelpWidget.tsx
 * Purpose: Guardian Links help information widget
 * Created: 2026-02-09
 *
 * Displays helpful information about the Guardian Link system
 * for managing students
 */

'use client';

import React from 'react';
import styles from './MyStudentHelpWidget.module.css';

export default function MyStudentHelpWidget() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Guardian Links</h3>
      </div>

      <div className={styles.content}>
        <p className={styles.description}>
          Invite students to link with your account. You'll be able to book
          sessions on their behalf and manage their learning preferences.
        </p>

        <ul className={styles.featureList}>
          <li className={styles.featureItem}>
            Each student gets their own learning profile
          </li>
          <li className={styles.featureItem}>
            Tutors can see student preferences before sessions
          </li>
          <li className={styles.featureItem}>
            You can manage up to 50 students
          </li>
        </ul>
      </div>
    </div>
  );
}
