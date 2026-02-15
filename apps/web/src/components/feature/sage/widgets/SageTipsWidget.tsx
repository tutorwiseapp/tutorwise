'use client';

/**
 * Sage Tips Widget
 *
 * Learning tips in the sidebar.
 *
 * @module components/feature/sage/widgets/SageTipsWidget
 */

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './SageTipsWidget.module.css';

interface SageTipsWidgetProps {
  subject?: string;
}

export default function SageTipsWidget({ subject }: SageTipsWidgetProps) {
  const tips = getTipsForSubject(subject);

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Learning Tips</h3>
      <div className={styles.content}>
        {tips.map((tip, index) => (
          <p key={index} className={styles.text}>
            {tip}
          </p>
        ))}
      </div>
    </HubComplexCard>
  );
}

function getTipsForSubject(subject?: string): string[] {
  switch (subject) {
    case 'maths':
      return [
        'Always show your working out.',
        'Check units in your answers.',
        'Draw diagrams to visualise problems.',
      ];
    case 'english':
      return [
        'Use quotes as evidence in essays.',
        'Plan your structure before writing.',
        'Proofread your work carefully.',
      ];
    case 'science':
      return [
        'Focus on understanding concepts.',
        'Learn key formulas and equations.',
        'Link related topics together.',
      ];
    default:
      return [
        'Ask "why" to deepen understanding.',
        'Break problems into smaller steps.',
        'Practice regularly for best results.',
      ];
  }
}
