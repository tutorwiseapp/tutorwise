/**
 * Filename: MyStudentVideoWidget.tsx
 * Purpose: Video resources widget for student management
 * Created: 2026-02-09
 *
 * Placeholder for video tutorial content.
 * Future: Embed tutorial videos for student management features.
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './MyStudentVideoWidget.module.css';

export default function MyStudentVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorials</h3>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.placeholderText}>Video content coming soon</div>
          <ul className={styles.topicList}>
            <li className={styles.topicItem}>Managing student profiles</li>
            <li className={styles.topicItem}>Booking on behalf of students</li>
            <li className={styles.topicItem}>Tracking learning progress</li>
          </ul>
        </div>
      </div>
    </HubComplexCard>
  );
}
