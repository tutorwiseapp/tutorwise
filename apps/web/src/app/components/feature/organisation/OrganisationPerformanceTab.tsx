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
import { TrendingUp, Users, Calendar, Star, Clock, BookOpen } from 'lucide-react';
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

interface RevenueTrendData {
  data: {
    week_start: string;
    week_label: string;
    total_revenue: number;
    sessions_count: number;
  }[];
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
}

interface BookingHeatmapData {
  data: {
    day_of_week: number;
    day_name: string;
    hour: number;
    bookings_count: number;
  }[];
}

interface StudentBreakdownData {
  data: {
    subject: string;
    student_count: number;
    revenue: number;
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

  // Fetch revenue trend
  const {
    data: revenueTrend,
    isLoading: trendLoading,
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

  // Fetch student breakdown
  const {
    data: studentBreakdown,
    isLoading: breakdownLoading,
  } = useQuery<StudentBreakdownData>({
    queryKey: ['organisation-analytics-student-breakdown', organisationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/organisation/${organisationId}/analytics/student-breakdown`
      );
      if (!response.ok) throw new Error('Failed to fetch student breakdown');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (changes less frequently)
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

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiLabel}>Total Revenue</div>
            <div className={styles.kpiValue}>
              {kpisLoading ? '...' : formatCurrency(kpis?.total_revenue || 0)}
            </div>
            {kpis && (
              <div className={kpis.revenue_change_pct >= 0 ? styles.kpiChangePositive : styles.kpiChangeNegative}>
                {formatPercentage(kpis.revenue_change_pct)}
              </div>
            )}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Users size={24} />
          </div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiLabel}>Active Students</div>
            <div className={styles.kpiValue}>
              {kpisLoading ? '...' : kpis?.active_students || 0}
            </div>
            {kpis && (
              <div className={kpis.students_change_pct >= 0 ? styles.kpiChangePositive : styles.kpiChangeNegative}>
                {formatPercentage(kpis.students_change_pct)}
              </div>
            )}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Calendar size={24} />
          </div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiLabel}>Total Sessions</div>
            <div className={styles.kpiValue}>
              {kpisLoading ? '...' : kpis?.total_sessions || 0}
            </div>
            {kpis && (
              <div className={kpis.sessions_change_pct >= 0 ? styles.kpiChangePositive : styles.kpiChangeNegative}>
                {formatPercentage(kpis.sessions_change_pct)}
              </div>
            )}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Star size={24} />
          </div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiLabel}>Avg. Rating</div>
            <div className={styles.kpiValue}>
              {kpisLoading ? '...' : kpis?.avg_session_rating?.toFixed(1) || '0.0'}
            </div>
            <div className={styles.kpiSubtext}>out of 5.0</div>
          </div>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Revenue Trend (Last 6 Weeks)</h3>
        {trendLoading ? (
          <div className={styles.loading}>Loading chart...</div>
        ) : (
          <div className={styles.chartContainer}>
            <div className={styles.simpleChart}>
              {revenueTrend?.data.map((week, index) => (
                <div key={index} className={styles.chartBar}>
                  <div
                    className={styles.chartBarFill}
                    style={{
                      height: `${Math.max((week.total_revenue / (revenueTrend.data[0]?.total_revenue || 1)) * 100, 5)}%`,
                    }}
                  >
                    <span className={styles.chartBarValue}>
                      {formatCurrency(week.total_revenue)}
                    </span>
                  </div>
                  <div className={styles.chartBarLabel}>{week.week_label}</div>
                  <div className={styles.chartBarSessions}>{week.sessions_count} sessions</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team Performance */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Team Performance</h3>
        {teamLoading ? (
          <div className={styles.loading}>Loading team data...</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Revenue</th>
                  <th>Sessions</th>
                  <th>Students</th>
                  <th>Avg. Rating</th>
                  <th>Last Session</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance?.data.map((member) => (
                  <tr key={member.member_id}>
                    <td>
                      <div className={styles.memberCell}>
                        {member.member_avatar_url ? (
                          <img
                            src={member.member_avatar_url}
                            alt={member.member_name}
                            className={styles.memberAvatar}
                          />
                        ) : (
                          <div className={styles.memberAvatarPlaceholder}>
                            {member.member_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className={styles.memberName}>{member.member_name}</span>
                      </div>
                    </td>
                    <td className={styles.numberCell}>{formatCurrency(member.total_revenue)}</td>
                    <td className={styles.numberCell}>{member.sessions_count}</td>
                    <td className={styles.numberCell}>{member.active_students_count}</td>
                    <td className={styles.numberCell}>
                      <div className={styles.ratingCell}>
                        <Star size={14} className={styles.ratingIcon} />
                        {member.avg_rating.toFixed(1)}
                      </div>
                    </td>
                    <td className={styles.dateCell}>
                      {member.last_session_at
                        ? new Date(member.last_session_at).toLocaleDateString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'No sessions'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Breakdown */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Student Breakdown by Subject</h3>
        {breakdownLoading ? (
          <div className={styles.loading}>Loading breakdown...</div>
        ) : (
          <div className={styles.breakdownGrid}>
            {studentBreakdown?.data.slice(0, 6).map((item, index) => (
              <div key={index} className={styles.breakdownCard}>
                <div className={styles.breakdownIcon}>
                  <BookOpen size={20} />
                </div>
                <div className={styles.breakdownContent}>
                  <div className={styles.breakdownSubject}>{item.subject}</div>
                  <div className={styles.breakdownStats}>
                    <span>{item.student_count} students</span>
                    <span className={styles.breakdownRevenue}>
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
