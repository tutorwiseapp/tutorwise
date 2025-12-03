/**
 * Filename: StudentStatsWidget.tsx
 * Purpose: My Students Hub Stats Widget
 * Created: 2025-11-18
 * Design: Uses HubStatsCard pattern
 *
 * Stats Displayed:
 * - Total Students (Count)
 * - Recently Added (Count - last 7 days)
 * - With Integrations (Count)
 * - Active This Month (Count)
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface StudentStatsWidgetProps {
  totalStudents: number;
  recentlyAdded: number;
  withIntegrations: number;
  activeThisMonth: number;
}

export default function StudentStatsWidget({
  totalStudents,
  recentlyAdded,
  withIntegrations,
  activeThisMonth,
}: StudentStatsWidgetProps) {
  const stats: StatRow[] = [
    {
      label: 'Total Students',
      value: totalStudents,
      valueColor: 'default',
    },
    {
      label: 'Recently Added',
      value: recentlyAdded,
      valueColor: recentlyAdded > 0 ? 'green' : 'default',
    },
    {
      label: 'With Integrations',
      value: withIntegrations,
      valueColor: 'default',
    },
    {
      label: 'Active This Month',
      value: activeThisMonth,
      valueColor: activeThisMonth > 0 ? 'green' : 'default',
    },
  ];

  return (
    <HubStatsCard
      title="Student Statistics"
      stats={stats}
    />
  );
}
