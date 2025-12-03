/**
 * Filename: AgencyStatsWidget.tsx
 * Purpose: Organisation Hub Stats Widget
 * Created: 2025-11-18
 * Design: Uses HubStatsCard pattern
 *
 * Stats Displayed:
 * - Active Tutors (Count)
 * - Total Students (Count)
 * - Monthly Revenue (Currency)
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface AgencyStatsWidgetProps {
  activeTutors: number;
  totalStudents: number;
  monthlyRevenue: number;
}

export default function AgencyStatsWidget({
  activeTutors,
  totalStudents,
  monthlyRevenue,
}: AgencyStatsWidgetProps) {
  const stats: StatRow[] = [
    {
      label: 'Active Tutors',
      value: activeTutors,
      valueColor: 'default',
    },
    {
      label: 'Total Students',
      value: totalStudents,
      valueColor: 'default',
    },
    {
      label: 'Monthly Revenue',
      value: `£${monthlyRevenue.toLocaleString()}`,
      valueColor: 'green',
    },
  ];

  return (
    <HubStatsCard
      title="Organisation Stats"
      stats={stats}
    />
  );
}
