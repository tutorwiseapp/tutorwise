/**
 * Filename: ReputationWidget.tsx
 * Purpose: Reviews Hub Stats Widget
 * Created: 2025-11-18
 * Design: Uses HubStatsCard pattern
 *
 * Stats Displayed:
 * - Total Reviews (Count)
 * - Average Rating (Stars)
 * - Pending Reviews (Count)
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface ReputationWidgetProps {
  totalReviews: number;
  averageRating: number;
  pendingReviews: number;
}

export default function ReputationWidget({
  totalReviews,
  averageRating,
  pendingReviews,
}: ReputationWidgetProps) {
  const stats: StatRow[] = [
    {
      label: 'Total Reviews',
      value: totalReviews,
      valueColor: 'default',
    },
    {
      label: 'Average Rating',
      value: `${averageRating.toFixed(1)} ⭐`,
      valueColor: 'green',
    },
    {
      label: 'Pending Reviews',
      value: pendingReviews,
      valueColor: pendingReviews > 0 ? 'orange' : 'default',
    },
  ];

  return (
    <HubStatsCard
      title="Your Reputation"
      stats={stats}
    />
  );
}
