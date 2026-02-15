'use client';

/**
 * Sage Video Widget
 *
 * Featured learning video in the sidebar.
 *
 * @module components/feature/sage/widgets/SageVideoWidget
 */

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './SageVideoWidget.module.css';

interface SageVideoWidgetProps {
  subject?: string;
}

export default function SageVideoWidget({ subject }: SageVideoWidgetProps) {
  const video = getVideoForSubject(subject);

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Video Tutorial</h3>
      <div className={styles.content}>
        <p className={styles.text}>{video.description}</p>
        <p className={styles.placeholder}>[Video content coming soon]</p>
      </div>
    </HubComplexCard>
  );
}

function getVideoForSubject(subject?: string): { description: string } {
  switch (subject) {
    case 'maths':
      return {
        description: 'Learn problem-solving strategies and mathematical thinking.',
      };
    case 'english':
      return {
        description: 'Master essay writing and reading comprehension techniques.',
      };
    case 'science':
      return {
        description: 'Understand the scientific method and key concepts.',
      };
    default:
      return {
        description: 'Learn effective study techniques and revision strategies.',
      };
  }
}
