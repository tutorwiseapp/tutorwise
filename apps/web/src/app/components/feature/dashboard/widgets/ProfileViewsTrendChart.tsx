/**
 * Filename: ProfileViewsTrendChart.tsx
 * Purpose: Line chart showing profile views trend over time
 * Created: 2025-12-08
 */

'use client';

import React, { memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './ProfileViewsTrendChart.module.css';

export interface DailyViews {
  date: string; // e.g., "Dec 1", "Dec 2"
  total_views: number;
  unique_viewers: number;
}

interface ProfileViewsTrendChartProps {
  data: DailyViews[];
  days?: number;
}

const ProfileViewsTrendChart = memo(function ProfileViewsTrendChart({
  data,
  days = 30
}: ProfileViewsTrendChartProps) {
  const totalViews = useMemo(() => {
    return data.reduce((sum, day) => sum + day.total_views, 0);
  }, [data]);

  const totalUniqueViewers = useMemo(() => {
    return data.reduce((sum, day) => sum + day.unique_viewers, 0);
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p className={styles.tooltipValue} style={{ color: '#2563EB' }}>
            Total Views: {payload[0].value}
          </p>
          {payload[1] && (
            <p className={styles.tooltipValue} style={{ color: '#059669' }}>
              Unique Viewers: {payload[1].value}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const hasData = data.length > 0 && totalViews > 0;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Profile Views Trend</h3>
          <p className={styles.subtitle}>Last {days} days</p>
        </div>
        {hasData && (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Views</span>
              <span className={styles.statValue}>{totalViews}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Unique Viewers</span>
              <span className={styles.statValue}>{totalUniqueViewers}</span>
            </div>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No profile views yet. Share your profile to start tracking views.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '0.75rem' }}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '0.75rem' }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="total_views"
              stroke="#2563EB"
              strokeWidth={2}
              dot={{ fill: '#2563EB', r: 4 }}
              activeDot={{ r: 6 }}
              name="Total Views"
            />
            <Line
              type="monotone"
              dataKey="unique_viewers"
              stroke="#059669"
              strokeWidth={2}
              dot={{ fill: '#059669', r: 4 }}
              activeDot={{ r: 6 }}
              name="Unique Viewers"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

export default ProfileViewsTrendChart;
