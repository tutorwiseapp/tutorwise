/**
 * Filename: VirtualSpaceStatsWidget.tsx
 * Purpose: VirtualSpace Hub Stats Widget - shows session statistics
 * Created: 2026-02-15
 * Design: Uses HubStatsCard for consistent stats display
 *
 * Pattern: Stats rows with colored values
 * - Active sessions: green
 * - Completed sessions: default
 * - Total sessions: default
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface VirtualSpaceStatsWidgetProps {
  active?: number;
  completed?: number;
  total?: number;
}

export const VirtualSpaceStatsWidget: React.FC<VirtualSpaceStatsWidgetProps> = ({
  active = 0,
  completed = 0,
  total = 0,
}) => {
  const stats: StatRow[] = [
    {
      label: 'Active Sessions',
      value: active,
      valueColor: active > 0 ? 'green' : 'default',
    },
    {
      label: 'Completed Sessions',
      value: completed,
      valueColor: 'default',
    },
    {
      label: 'Total Sessions',
      value: total,
      valueColor: 'default',
    },
  ];

  return <HubStatsCard title="Session Stats" stats={stats} />;
};

export default VirtualSpaceStatsWidget;
