/**
 * Filename: UserStatsWidget.tsx
 * Purpose: Generic user stats widget - reusable across user dashboard
 * Created: 2026-01-22
 * Phase: Dashboard Alignment Phase 1.5
 * Design: Wraps HubStatsCard for user-specific stats display (follows AdminStatsWidget pattern)
 *
 * Usage:
 * <UserStatsWidget
 *   title="My Statistics"
 *   stats={[
 *     { label: 'Sessions Completed', value: 42 },
 *     { label: 'Total Earnings', value: '£1,234', valueColor: 'green' },
 *     { label: 'Pending Reviews', value: 3, valueColor: 'orange' },
 *   ]}
 * />
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface UserStatsWidgetProps {
  title: string;
  stats: StatRow[];
}

export default function UserStatsWidget({ title, stats }: UserStatsWidgetProps) {
  return <HubStatsCard title={title} stats={stats} />;
}
