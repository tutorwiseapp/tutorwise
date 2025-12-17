/**
 * Filename: HubEarningsTrendChart.tsx
 * Purpose: Line chart showing earnings/revenue trend over time
 * Created: 2025-12-17
 * Pattern: Reusable chart for Dashboard, Organisation, and other hubs
 */

'use client';

import React, { memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './HubEarningsTrendChart.module.css';

export interface WeeklyEarnings {
  week: string; // e.g., "Week 1", "Nov 27"
  earnings: number;
  previousPeriod?: number; // For comparison
  sessions?: number; // Optional sessions count for tooltip
}

interface HubEarningsTrendChartProps {
  data: WeeklyEarnings[];
  title?: string;
  subtitle?: string;
  currency?: string;
  showComparison?: boolean;
  dataKey?: string; // Allows "revenue" or "earnings"
}

const HubEarningsTrendChart = memo(function HubEarningsTrendChart({
  data,
  title = 'Earnings Trend',
  subtitle = 'Last 6 weeks',
  currency = 'GBP',
  showComparison = false,
  dataKey = 'earnings'
}: HubEarningsTrendChartProps) {
  const formatCurrency = useMemo(() => {
    return (value: number) => new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, [currency]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p className={styles.tooltipValue} style={{ color: '#059669' }}>
            Current: {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.sessions && (
            <p className={styles.tooltipSessions}>
              {payload[0].payload.sessions} sessions
            </p>
          )}
          {showComparison && payload[1] && (
            <p className={styles.tooltipValue} style={{ color: '#9ca3af' }}>
              Previous: {formatCurrency(payload[1].value)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#059669"
            strokeWidth={2}
            dot={{ fill: '#059669', r: 4 }}
            activeDot={{ r: 6 }}
            name="Current Period"
          />
          {showComparison && (
            <Line
              type="monotone"
              dataKey="previousPeriod"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#9ca3af', r: 3 }}
              name="Previous Period"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default HubEarningsTrendChart;
