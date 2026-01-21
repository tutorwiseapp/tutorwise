/**
 * Filename: OrganisationEarningsTrendChart.tsx
 * Purpose: Organisation-specific earnings trend chart with data fetching
 * Created: 2025-12-07
 * Updated: 2025-12-17 - Refactored to wrapper pattern using HubEarningsTrendChart
 * Pattern: Wrapper component that fetches data and delegates to hub component
 */

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import HubEarningsTrendChart, { WeeklyEarnings } from '@/app/components/hub/charts/HubEarningsTrendChart';

interface OrganisationEarningsTrendChartProps {
  organisationId: string;
  currency?: string;
  showComparison?: boolean;
}

interface RevenueTrendData {
  data: {
    week_start: string;
    week_label: string;
    total_revenue: number;
    sessions_count: number;
  }[];
}

export default function OrganisationEarningsTrendChart({
  organisationId,
  currency = 'GBP',
  showComparison = false
}: OrganisationEarningsTrendChartProps) {
  // Fetch revenue trend data
  const {
    data: revenueTrend,
  } = useQuery<RevenueTrendData>({
    queryKey: ['organisation-analytics-revenue-trend', organisationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/organisation/${organisationId}/analytics/revenue-trend?weeks=6`
      );
      if (!response.ok) throw new Error('Failed to fetch revenue trend');
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Transform API data to chart format
  const chartData: WeeklyEarnings[] | undefined = revenueTrend?.data && revenueTrend.data.length > 0
    ? revenueTrend.data.map(week => ({
        week: week.week_label,
        earnings: week.total_revenue,
      }))
    : undefined; // Let HubEarningsTrendChart handle empty data

  // Delegate rendering to hub component
  return (
    <HubEarningsTrendChart
      data={chartData}
      currency={currency}
      showComparison={showComparison}
    />
  );
}
