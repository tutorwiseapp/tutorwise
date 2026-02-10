/**
 * Filename: OrganisationPerformanceTab.tsx
 * Purpose: Performance Analytics tab for Organisation Premium subscribers
 * Created: 2025-12-15
 * Version: v7.0 - Organisation Premium Performance Analytics
 *
 * Displays:
 * - KPI cards (revenue, students, sessions, ratings)
 * - Revenue trend chart
 * - Team performance table
 * - Booking heatmap
 * - Student breakdown by subject
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Calendar, Star } from 'lucide-react';
import { HubKPICard, HubKPIGrid, HubTeamPerformanceTable } from '@/app/components/hub/charts';
import OrganisationEarningsTrendChart from '../performance/OrganisationEarningsTrendChart';
import OrganisationStudentTypeBreakdown from '../performance/OrganisationStudentTypeBreakdown';
import styles from './OrganisationPerformanceTab.module.css';

interface OrganisationPerformanceTabProps {
  organisationId: string;
}

interface KPIData {
  total_revenue: number;
  revenue_change_pct: number;
  active_students: number;
  students_change_pct: number;
  avg_session_rating: number;
  team_utilization_rate: number;
  total_sessions: number;
  sessions_change_pct: number;
}

interface TeamPerformanceData {
  data: {
    member_id: string;
    member_name: string;
    member_email: string;
    member_avatar_url: string | null;
    total_revenue: number;
    sessions_count: number;
    active_students_count: number;
    avg_rating: number;
    last_session_at: string | null;
  }[];
  isOwnerOrAdmin?: boolean; // Whether viewer is owner/admin
  totalMembers?: number; // Total member count
}

interface _BookingHeatmapData {
  data: {
    day_of_week: number;
    day_name: string;
    hour: number;
    bookings_count: number;
  }[];
}

export default function OrganisationPerformanceTab({
  organisationId,
}: OrganisationPerformanceTabProps) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Fetch KPIs
  const {
    data: kpis,
    isLoading: kpisLoading,
    error: kpisError,
  } = useQuery<KPIData>({
    queryKey: ['organisation-analytics-kpis', organisationId, period],
    queryFn: async () => {
      const response = await fetch(
        `/api/organisation/${organisationId}/analytics/kpis?period=${period}`
      );
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch team performance
  const {
    data: teamPerformance,
    isLoading: teamLoading,
  } = useQuery<TeamPerformanceData>({
    queryKey: ['organisation-analytics-team-performance', organisationId, period],
    queryFn: async () => {
      const response = await fetch(
        `/api/organisation/${organisationId}/analytics/team-performance?period=${period}`
      );
      if (!response.ok) throw new Error('Failed to fetch team performance');
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (kpisError) {
    return (
      <div className={styles.error}>
        <p>Failed to load performance analytics. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Period Selector */}
      <div className={styles.header}>
        <h2 className={styles.title}>Performance Analytics</h2>
        <div className={styles.periodSelector}>
          <button
            className={period === 'month' ? styles.periodActive : styles.periodButton}
            onClick={() => setPeriod('month')}
          >
            This Month
          </button>
          <button
            className={period === 'quarter' ? styles.periodActive : styles.periodButton}
            onClick={() => setPeriod('quarter')}
          >
            This Quarter
          </button>
          <button
            className={period === 'year' ? styles.periodActive : styles.periodButton}
            onClick={() => setPeriod('year')}
          >
            This Year
          </button>
        </div>
      </div>

      {/* KPI Cards - Using Hub Components */}
      <HubKPIGrid>
        <HubKPICard
          label="Total Revenue"
          value={kpisLoading ? '...' : formatCurrency(kpis?.total_revenue || 0)}
          change={kpis ? formatPercentage(kpis.revenue_change_pct) : undefined}
          timeframe={`This ${period === 'month' ? 'Month' : period === 'quarter' ? 'Quarter' : 'Year'}`}
          icon={TrendingUp}
          variant="success"
        />
        <HubKPICard
          label="Active Students"
          value={kpisLoading ? '...' : kpis?.active_students || 0}
          change={kpis ? formatPercentage(kpis.students_change_pct) : undefined}
          timeframe={`This ${period === 'month' ? 'Month' : period === 'quarter' ? 'Quarter' : 'Year'}`}
          icon={Users}
          variant="info"
        />
        <HubKPICard
          label="Total Sessions"
          value={kpisLoading ? '...' : kpis?.total_sessions || 0}
          change={kpis ? formatPercentage(kpis.sessions_change_pct) : undefined}
          timeframe={`This ${period === 'month' ? 'Month' : period === 'quarter' ? 'Quarter' : 'Year'}`}
          icon={Calendar}
          variant="neutral"
        />
        <HubKPICard
          label="Avg. Rating"
          value={kpisLoading ? '...' : kpis?.avg_session_rating?.toFixed(1) || '0.0'}
          sublabel="out of 5.0"
          icon={Star}
          variant="success"
        />
      </HubKPIGrid>

      {/* Revenue Trend - Using Organisation Component */}
      <div className={styles.section}>
        <OrganisationEarningsTrendChart organisationId={organisationId} />
      </div>

      {/* Team Performance - Using Hub Component */}
      <div className={styles.section}>
        <HubTeamPerformanceTable
          data={teamPerformance?.data || []}
          formatCurrency={formatCurrency}
          isLoading={teamLoading}
          isOwnerOrAdmin={teamPerformance?.isOwnerOrAdmin || false}
          totalMembers={teamPerformance?.totalMembers || 0}
        />
      </div>

      {/* Student Type Breakdown - Using Organisation Component */}
      <div className={styles.section}>
        <OrganisationStudentTypeBreakdown
          organisationId={organisationId}
          defaultView="pie"
        />
      </div>
    </div>
  );
}
