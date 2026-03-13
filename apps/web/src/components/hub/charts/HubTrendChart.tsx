/**
 * Filename: HubTrendChart.tsx
 * Purpose: Generic line chart for displaying trend data over time
 * Created: 2025-12-17
 * Pattern: Reusable chart component (can be used for earnings, conversions, views, etc.)
 */

'use client';

import React, { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './HubTrendChart.module.css';

export interface TrendDataPoint {
  label: string; // X-axis label (e.g., "Week 1", "Jan 15", "Monday")
  value: number; // Primary value
  comparisonValue?: number; // Optional comparison value (e.g., previous period)
  [key: string]: any; // Allow additional data fields
}

export interface HubTrendChartProps {
  data: TrendDataPoint[];
  title: string;
  subtitle?: string;
  valueFormatter?: (value: number) => string;
  lineColor?: string;
  comparisonLineColor?: string;
  showComparison?: boolean;
  height?: number;
  valueName?: string; // Name for the primary line (e.g., "Current Period", "Conversions")
  comparisonName?: string; // Name for the comparison line (e.g., "Previous Period")
}

const HubTrendChart = memo(function HubTrendChart({
  data,
  title,
  subtitle,
  valueFormatter = (value: number) => value.toString(),
  lineColor = '#059669',
  comparisonLineColor = '#9ca3af',
  showComparison = false,
  height = 250,
  valueName = 'Current Period',
  comparisonName = 'Previous Period',
}: HubTrendChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p className={styles.tooltipValue} style={{ color: lineColor }}>
            {valueName}: {valueFormatter(payload[0].value)}
          </p>
          {showComparison && payload[1] && (
            <p className={styles.tooltipValue} style={{ color: comparisonLineColor }}>
              {comparisonName}: {valueFormatter(payload[1].value)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const hasData = data && data.length > 0;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>{title}</h3>
        </div>
      </div>

      <div className={styles.content}>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        {!hasData ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No data available yet. Data will appear here once you have activity to track.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                style={{ fontSize: '0.75rem' }}
                tickLine={false}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '0.75rem' }}
                tickFormatter={valueFormatter}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ fill: lineColor, r: 4 }}
                activeDot={{ r: 6 }}
                name={valueName}
              />
              {showComparison && (
                <Line
                  type="monotone"
                  dataKey="comparisonValue"
                  stroke={comparisonLineColor}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: comparisonLineColor, r: 3 }}
                  name={comparisonName}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
});

export default HubTrendChart;
