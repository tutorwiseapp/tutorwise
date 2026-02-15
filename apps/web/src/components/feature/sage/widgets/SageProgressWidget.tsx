'use client';

/**
 * Sage Progress Widget
 *
 * Displays learning progress stats in the sidebar.
 *
 * @module components/feature/sage/widgets/SageProgressWidget
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface SageProgressWidgetProps {
  studentId?: string;
}

export default function SageProgressWidget({ studentId }: SageProgressWidgetProps) {
  const { data } = useQuery({
    queryKey: ['sage-progress-widget', studentId],
    queryFn: async () => {
      const res = await fetch('/api/sage/progress?period=30days');
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });

  const progress = data?.progress;

  const stats: StatRow[] = [
    {
      label: 'Sessions This Month',
      value: progress?.totalSessions ?? 0,
      valueColor: 'default',
    },
    {
      label: 'Topics Covered',
      value: progress?.topicsCovered?.length ?? 0,
      valueColor: progress?.topicsCovered?.length > 0 ? 'green' : 'default',
    },
    {
      label: 'Subjects Studied',
      value: progress?.subjectsStudied?.length ?? 0,
      valueColor: 'default',
    },
  ];

  return <HubStatsCard title="Learning Progress" stats={stats} />;
}
