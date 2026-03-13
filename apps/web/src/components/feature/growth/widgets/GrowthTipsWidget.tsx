'use client';

/**
 * Filename: GrowthTipsWidget.tsx
 * Purpose: Role-adaptive growth tips in the sidebar
 * Pattern: Mirrors SageTipsWidget — indigo theme
 */

import React from 'react';
import HubComplexCard from '@/components/hub/sidebar/cards/HubComplexCard';
import styles from './GrowthTipsWidget.module.css';

interface GrowthTipsWidgetProps {
  role?: string;
}

export default function GrowthTipsWidget({ role }: GrowthTipsWidgetProps) {
  const tips = getTipsForRole(role);

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Growth Tips</h3>
      <div className={styles.content}>
        {tips.map((tip, index) => (
          <p key={index} className={styles.text}>{tip}</p>
        ))}
      </div>
    </HubComplexCard>
  );
}

function getTipsForRole(role?: string): string[] {
  switch (role) {
    case 'agent':
      return [
        'September and January are your biggest conversion months — plan outreach early.',
        'Each referred student is worth £200–1,200/year in commission.',
        'Delegation multiplies your pipeline without adding your time.',
      ];
    case 'client':
      return [
        'Your referral link earns 10% commission on every booking — share it now.',
        'Creating an AI Tutor from a skilled tutor you know earns you passively 24/7.',
        'You don\'t need to be a tutor to earn on Tutorwise.',
      ];
    case 'organisation':
      return [
        'Every tutor in your organisation adds to your margin — focus on recruitment.',
        'AI Tutors earn 24/7 without increasing your overhead.',
        'Benchmark your margin against the platform average each quarter.',
      ];
    default: // tutor
      return [
        'Tutors priced 15–20% below market rate fill up fastest — then raise rates.',
        'A complete listing with 200+ words gets 3× more enquiries.',
        'Your first AI Tutor earns passively while you sleep.',
      ];
  }
}
