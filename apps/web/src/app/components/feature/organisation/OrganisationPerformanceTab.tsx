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

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Calendar, Star, Clock, BookOpen, PieChartIcon, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
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

interface StudentTypeData {
  new: number;
  returning: number;
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

  // Fetch student type breakdown
  const {
    data: studentBreakdownData = { new: 0, returning: 0 },
    isLoading: isLoadingStudentBreakdown,
  } = useQuery<StudentTypeData>({
    queryKey: ['organisation-analytics-student-breakdown', organisationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/organisation/${organisationId}/analytics/student-breakdown`
      );
      if (!response.ok) throw new Error('Failed to fetch student breakdown');
      return response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // View type for student breakdown chart
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');

  // Chart view toggle callbacks
  const handlePieView = useCallback(() => setViewType('pie'), []);
  const handleBarView = useCallback(() => setViewType('bar'), []);

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

  // Prepare data for student breakdown chart - memoized to prevent recalculation
  const chartData = useMemo(() => [
    { name: 'New Students', value: studentBreakdownData.new, color: '#2563EB' },
    { name: 'Returning Students', value: studentBreakdownData.returning, color: '#059669' }
  ], [studentBreakdownData.new, studentBreakdownData.returning]);

  const totalStudents = useMemo(() =>
    studentBreakdownData.new + studentBreakdownData.returning,
    [studentBreakdownData.new, studentBreakdownData.returning]
  );

  const hasStudentData = totalStudents > 0;

  // Custom tooltip for student breakdown
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = totalStudents > 0 ? ((payload[0].value / totalStudents) * 100).toFixed(1) : '0';
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{payload[0].name}</p>
          <p className={styles.tooltipValue}>
            {payload[0].value} students ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
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

      {/* KPI Cards - Matching Dashboard Structure */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <TrendingUp size={20} className={styles.kpiIcon} />
            <div className={styles.kpiLabel}>Total Revenue</div>
          </div>
          <div className={styles.kpiValue}>
            {kpisLoading ? '...' : formatCurrency(kpis?.total_revenue || 0)}
          </div>
          {kpis && (
            <div className={kpis.revenue_change_pct >= 0 ? styles.kpiChangePositive : styles.kpiChangeNegative}>
              {formatPercentage(kpis.revenue_change_pct)}
            </div>
          )}
          <div className={styles.kpiSubtext}>This {period === 'month' ? 'Month' : period === 'quarter' ? 'Quarter' : 'Year'}</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <Users size={20} className={styles.kpiIcon} />
            <div className={styles.kpiLabel}>Active Students</div>
          </div>
          <div className={styles.kpiValue}>
            {kpisLoading ? '...' : kpis?.active_students || 0}
          </div>
          {kpis && (
            <div className={kpis.students_change_pct >= 0 ? styles.kpiChangePositive : styles.kpiChangeNegative}>
              {formatPercentage(kpis.students_change_pct)}
            </div>
          )}
          <div className={styles.kpiSubtext}>This {period === 'month' ? 'Month' : period === 'quarter' ? 'Quarter' : 'Year'}</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <Calendar size={20} className={styles.kpiIcon} />
            <div className={styles.kpiLabel}>Total Sessions</div>
          </div>
          <div className={styles.kpiValue}>
            {kpisLoading ? '...' : kpis?.total_sessions || 0}
          </div>
          {kpis && (
            <div className={kpis.sessions_change_pct >= 0 ? styles.kpiChangePositive : styles.kpiChangeNegative}>
              {formatPercentage(kpis.sessions_change_pct)}
            </div>
          )}
          <div className={styles.kpiSubtext}>This {period === 'month' ? 'Month' : period === 'quarter' ? 'Quarter' : 'Year'}</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <Star size={20} className={styles.kpiIcon} />
            <div className={styles.kpiLabel}>Avg. Rating</div>
          </div>
          <div className={styles.kpiValue}>
            {kpisLoading ? '...' : kpis?.avg_session_rating?.toFixed(1) || '0.0'}
          </div>
          <div className={styles.kpiSubtext}>out of 5.0</div>
        </div>
      </div>

      {/* Revenue Trend - Matching Dashboard Design */}
      <div className={styles.section}>
        {trendLoading ? (
          <div className={styles.loading}>Loading chart...</div>
        ) : (
          <div className={styles.chartContainer}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>Revenue Trend</h3>
              <p className={styles.chartSubtitle}>Last 6 weeks</p>
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={revenueTrend?.data.map(week => ({
                  week: week.week_label,
                  revenue: week.total_revenue,
                  sessions: week.sessions_count
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="week"
                  stroke="#6b7280"
                  style={{ fontSize: '0.75rem' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '0.75rem' }}
                  tickFormatter={(value) => formatCurrency(value)}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className={styles.tooltip}>
                          <p className={styles.tooltipLabel}>{label}</p>
                          <p className={styles.tooltipValue} style={{ color: '#059669' }}>
                            Revenue: {formatCurrency(payload[0].value as number)}
                          </p>
                          <p className={styles.tooltipSessions}>
                            {payload[0].payload.sessions} sessions
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ fill: '#059669', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Current Period"
                />
              </LineChart>
            </ResponsiveContainer>
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

      {/* Student Type Breakdown - Copied from Dashboard */}
      <div className={styles.section}>
        <div className={styles.studentWidget}>
          <div className={styles.widgetHeader}>
            <div className={styles.widgetHeaderLeft}>
              <Users className={styles.widgetIcon} size={20} />
              <h3 className={styles.widgetTitle}>Student Type Breakdown</h3>
            </div>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleButton} ${viewType === 'pie' ? styles.toggleActive : ''}`}
                onClick={handlePieView}
                aria-label="Pie chart view"
              >
                <PieChartIcon size={16} />
              </button>
              <button
                className={`${styles.toggleButton} ${viewType === 'bar' ? styles.toggleActive : ''}`}
                onClick={handleBarView}
                aria-label="Bar chart view"
              >
                <BarChart3 size={16} />
              </button>
            </div>
          </div>

          <div className={styles.widgetContent}>
            {!hasStudentData ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>No student data available yet. Start booking sessions to see your student breakdown.</p>
              </div>
            ) : (
              <>
                {/* Chart */}
                <div className={styles.studentChartContainer}>
                  {viewType === 'pie' ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Stats Summary */}
                <div className={styles.statsSummary}>
                  <div className={styles.statItem}>
                    <div className={styles.statDot} style={{ backgroundColor: '#2563EB' }} />
                    <div className={styles.statContent}>
                      <span className={styles.statLabel}>New Students</span>
                      <span className={styles.statValue}>{studentBreakdownData.new}</span>
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statDot} style={{ backgroundColor: '#059669' }} />
                    <div className={styles.statContent}>
                      <span className={styles.statLabel}>Returning Students</span>
                      <span className={styles.statValue}>{studentBreakdownData.returning}</span>
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statDot} style={{ backgroundColor: '#6b7280' }} />
                    <div className={styles.statContent}>
                      <span className={styles.statLabel}>Total</span>
                      <span className={styles.statValue}>{totalStudents}</span>
                    </div>
                  </div>
                </div>

                {/* Insight */}
                {studentBreakdownData.returning > 0 && (
                  <div className={styles.insight}>
                    <p className={styles.insightText}>
                      <strong>{((studentBreakdownData.returning / totalStudents) * 100).toFixed(0)}%</strong> of your students are returning -
                      {studentBreakdownData.returning / totalStudents > 0.5 ? ' excellent retention!' : ' focus on building long-term relationships.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
