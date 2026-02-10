/**
 * Filename: MyStudentTipWidget.tsx
 * Purpose: Context-aware tips widget for student management
 * Created: 2026-02-09
 *
 * Displays helpful tips that adapt to the user's context (page, student count, etc.)
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './MyStudentTipWidget.module.css';

interface Tip {
  title: string;
  description: string;
}

interface MyStudentTipWidgetProps {
  context?: 'my-students' | 'overview' | 'bookings' | 'preferences';
  studentCount?: number;
}

const tips: Record<string, Tip[]> = {
  'my-students': [
    {
      title: 'Export Student Data',
      description: 'Use the export button to download student information as CSV for your records',
    },
    {
      title: 'Set Learning Preferences Early',
      description: 'Complete student preferences before booking sessions for better tutor matches',
    },
    {
      title: 'Track Progress',
      description: 'Review completed sessions regularly to monitor student learning progress',
    },
  ],
  'overview': [
    {
      title: 'Complete All Profile Fields',
      description: 'Fill in all student information for better tutor recommendations',
    },
    {
      title: 'Add Learning Goals',
      description: 'Specify learning goals to help tutors prepare targeted sessions',
    },
    {
      title: 'Update Regularly',
      description: 'Keep preferences current as student needs change throughout the year',
    },
  ],
  'bookings': [
    {
      title: 'Book Recurring Sessions',
      description: 'Set up recurring bookings for regular learning and better progress',
    },
    {
      title: 'Add Session Notes',
      description: 'Use notes to communicate special requirements or focus areas',
    },
    {
      title: 'Check Availability First',
      description: 'Review tutor availability before making booking requests',
    },
  ],
  'preferences': [
    {
      title: 'Be Specific',
      description: 'Detailed preferences help tutors prepare more effectively',
    },
    {
      title: 'Include Learning Style',
      description: 'Mention if student learns better visually, by doing, or through discussion',
    },
    {
      title: 'Note Special Needs',
      description: 'Share any learning differences or accommodations needed',
    },
  ],
};

export default function MyStudentTipWidget({ context = 'my-students', studentCount: _studentCount = 0 }: MyStudentTipWidgetProps) {
  const contextTips = tips[context] || tips['my-students'];

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Quick Tips</h3>
      <div className={styles.content}>
        <ul className={styles.tipsList}>
          {contextTips.map((tip, index) => (
            <li key={index} className={styles.tipItem}>
              <div className={styles.tipTitle}>{tip.title}</div>
              <div className={styles.tipDescription}>{tip.description}</div>
            </li>
          ))}
        </ul>
      </div>
    </HubComplexCard>
  );
}
