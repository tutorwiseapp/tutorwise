/**
 * Filename: apps/web/src/app/components/feature/network/NetworkStatsWidget.tsx
 * Purpose: Network statistics widget using HubStatsCard shell
 * Created: 2025-11-07
 * Updated: 2025-11-18 - Migrated to v2 design system (context-sidebar-ui-design-v2.md)
 * Design: Section 2.4 - Network Hub Stats Card
 *
 * Pattern: Uses HubStatsCard shell
 * Stats Shown:
 * - Total Connections
 * - Pending Requests
 * - New This Month
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';
import type { Connection } from './ConnectionCard';

interface NetworkStatsWidgetProps {
  stats: {
    total: number;
    pendingReceived: number;
    pendingSent: number;
  };
  connections: Connection[];
}

export default function NetworkStatsWidget({
  stats,
  connections,
}: NetworkStatsWidgetProps) {
  // Calculate new connections this month
  const newThisMonth = connections.filter(c => {
    const created = new Date(c.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() &&
           created.getFullYear() === now.getFullYear();
  }).length;

  // Build stats rows following design spec (Section 2.4)
  const statsRows: StatRow[] = [
    {
      label: 'Total Connections',
      value: stats.total,
      valueColor: 'default',
    },
    {
      label: 'Pending Requests',
      value: stats.pendingReceived,
      valueColor: 'default',
    },
    {
      label: 'New This Month',
      value: newThisMonth,
      valueColor: 'default',
    },
  ];

  return (
    <HubStatsCard
      title="Network Stats"
      stats={statsRows}
    />
  );
}
