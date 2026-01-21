/**
 * Filename: ReferralTipWidget.tsx
 * Purpose: Referral Program Tip Widget
 * Created: 2026-01-02
 * Pattern: Follows OrganisationTipWidget pattern using HubComplexCard
 */

'use client';

import React, { useState, useEffect } from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './OrganisationTipWidget.module.css'; // Reuse existing styles

const REFERRAL_TIPS = [
  'Personalize your referral approach - mention specific benefits that match each prospect\'s needs.',
  'Follow up within 24 hours of sending a referral to maintain momentum and show commitment.',
  'Use the Pipeline tab to track referral progress and identify which stage needs attention.',
  'Qualified referrals convert better - focus on prospects who match your ideal client profile.',
  'Share success stories and testimonials when making referrals to build trust and credibility.',
  'Set monthly referral goals in the Achievements tab to stay motivated and track progress.',
  'Warm introductions convert 5x better than cold referrals - always introduce prospects personally.',
  'Review your conversion funnel weekly to identify and fix bottlenecks in your referral process.',
];

export default function ReferralTipWidget() {
  const [tip, setTip] = useState('');

  useEffect(() => {
    // Show a random tip on mount
    const randomTip = REFERRAL_TIPS[Math.floor(Math.random() * REFERRAL_TIPS.length)];
    setTip(randomTip);
  }, []);

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Referral Tip</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          {tip || 'Loading tip...'}
        </p>
      </div>
    </HubComplexCard>
  );
}
