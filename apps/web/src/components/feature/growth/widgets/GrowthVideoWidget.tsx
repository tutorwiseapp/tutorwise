'use client';

/**
 * Filename: GrowthVideoWidget.tsx
 * Purpose: Featured growth video in the sidebar
 * Pattern: Mirrors SageVideoWidget — indigo theme
 */

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './GrowthVideoWidget.module.css';

interface GrowthVideoWidgetProps {
  role?: string;
}

export default function GrowthVideoWidget({ role }: GrowthVideoWidgetProps) {
  const video = getVideoForRole(role);

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

function getVideoForRole(role?: string): { description: string } {
  switch (role) {
    case 'agent':
      return { description: 'Learn how to build a referral pipeline and maximise commission income.' };
    case 'client':
      return { description: 'Discover how to earn passively on Tutorwise through referrals and AI Tutors.' };
    case 'organisation':
      return { description: 'Learn how to grow your organisation margin and recruit more tutors.' };
    default: // tutor
      return { description: 'Learn how to optimise your pricing, listings, and income streams as a tutor.' };
  }
}
