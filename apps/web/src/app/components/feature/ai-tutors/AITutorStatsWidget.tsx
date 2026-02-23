/**
 * Filename: AITutorStatsWidget.tsx
 * Purpose: AI Tutor Stats Widget - shows key metrics
 * Created: 2026-02-23
 * Pattern: Uses HubStatsCard (matches BookingStatsWidget)
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface AITutorStatsWidgetProps {
  activeTutors?: number;
  totalSessions?: number;
  totalRevenue?: number;
}

export default function AITutorStatsWidget({
  activeTutors = 0,
  totalSessions = 0,
  totalRevenue = 0,
}: AITutorStatsWidgetProps) {
  const stats: StatRow[] = [
    {
      label: 'Active AI Tutors',
      value: activeTutors,
      valueColor: activeTutors > 0 ? 'green' : 'default',
    },
    {
      label: 'Total Sessions',
      value: totalSessions,
      valueColor: 'default',
    },
    {
      label: 'Total Revenue',
      value: `£${totalRevenue.toFixed(2)}`,
      valueColor: totalRevenue > 0 ? 'green' : 'default',
    },
  ];

  return <HubStatsCard title="AI Tutor Stats" stats={stats} />;
}
