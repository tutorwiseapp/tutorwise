/**
 * Filename: AIAgentStatsWidget.tsx
 * Purpose: AI Tutor Stats Widget - shows key metrics
 * Created: 2026-02-23
 * Pattern: Uses HubStatsCard (matches ListingStatsWidget)
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface AIAgentStatsWidgetProps {
  aiTutors?: any[];
  isLoading?: boolean;
}

export default function AIAgentStatsWidget({
  aiTutors = [],
  isLoading = false,
}: AIAgentStatsWidgetProps) {
  const activeAgents = aiTutors.filter(t => t.status === 'published').length;
  const totalSessions = aiTutors.reduce((sum, t) => sum + (t.total_sessions || 0), 0);
  const totalRevenue = aiTutors.reduce((sum, t) => sum + (t.total_revenue || 0), 0);

  const stats: StatRow[] = [
    {
      label: 'Active AI Tutors',
      value: isLoading ? '-' : activeAgents,
      valueColor: activeAgents > 0 ? 'green' : 'default',
    },
    {
      label: 'Total Sessions',
      value: isLoading ? '-' : totalSessions,
      valueColor: 'default',
    },
    {
      label: 'Total Revenue',
      value: isLoading ? '-' : `£${totalRevenue.toFixed(2)}`,
      valueColor: totalRevenue > 0 ? 'green' : 'default',
    },
    {
      label: 'Total AI Tutors',
      value: isLoading ? '-' : aiTutors.length,
      valueColor: 'default',
    },
  ];

  return <HubStatsCard title="AI Tutor Stats" stats={stats} />;
}
