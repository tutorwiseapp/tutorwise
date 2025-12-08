/**
 * Filename: ReferrerSourcesChart.tsx
 * Purpose: Chart showing breakdown of where profile views came from
 * Created: 2025-12-08
 */

'use client';

import React, { memo, useMemo, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ExternalLink, BarChart3, PieChartIcon } from 'lucide-react';
import styles from './ReferrerSourcesChart.module.css';

export interface ReferrerData {
  source: string;
  count: number;
}

interface ReferrerSourcesChartProps {
  data: ReferrerData[];
  defaultView?: 'pie' | 'bar';
}

const COLORS = [
  '#2563EB', // Blue - search/marketplace
  '#059669', // Green - direct
  '#EA580C', // Orange - listing
  '#7C3AED', // Purple - referral
  '#DC2626', // Red - social
  '#6b7280', // Gray - other
];

const ReferrerSourcesChart = memo(function ReferrerSourcesChart({
  data = [],
  defaultView = 'pie'
}: ReferrerSourcesChartProps) {
  const [viewType, setViewType] = useState<'pie' | 'bar'>(defaultView);

  // Prepare data for charts - memoized to prevent recalculation
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      name: item.source || 'Direct',
      value: item.count,
      color: COLORS[index % COLORS.length]
    }));
  }, [data]);

  const total = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);
  const hasData = total > 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{payload[0].name}</p>
          <p className={styles.tooltipValue}>
            {payload[0].value} views ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ExternalLink className={styles.icon} size={20} />
          <div>
            <h3 className={styles.title}>Referrer Sources</h3>
            <p className={styles.subtitle}>Where your views come from</p>
          </div>
        </div>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${viewType === 'pie' ? styles.toggleActive : ''}`}
            onClick={useCallback(() => setViewType('pie'), [])}
            aria-label="Pie chart view"
          >
            <PieChartIcon size={16} />
          </button>
          <button
            className={`${styles.toggleButton} ${viewType === 'bar' ? styles.toggleActive : ''}`}
            onClick={useCallback(() => setViewType('bar'), [])}
            aria-label="Bar chart view"
          >
            <BarChart3 size={16} />
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {!hasData ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No referrer data available yet. Share your profile to start tracking where views come from.</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className={styles.chartContainer}>
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
                    <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
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
              {chartData.map((item, index) => (
                <div key={index} className={styles.statItem}>
                  <div className={styles.statDot} style={{ backgroundColor: item.color }} />
                  <div className={styles.statContent}>
                    <span className={styles.statLabel}>{item.name}</span>
                    <span className={styles.statValue}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Insight */}
            {chartData.length > 0 && (
              <div className={styles.insight}>
                <p className={styles.insightText}>
                  <strong>{chartData[0].name}</strong> is your top referrer source with {' '}
                  <strong>{((chartData[0].value / total) * 100).toFixed(0)}%</strong> of total views.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default ReferrerSourcesChart;
