/**
 * Filename: ReferralSourcesChart.tsx
 * Purpose: Pie chart showing breakdown of referral sources (Direct Link, QR Code, Embed Code, Social Share)
 * Created: 2025-12-07
 * Phase 3: Performance Dashboard
 */

'use client';

import React, { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Share2 } from 'lucide-react';
import styles from './ReferralSourcesChart.module.css';

export interface ReferralSourceData {
  'Direct Link': number;
  'QR Code': number;
  'Embed Code': number;
  'Social Share': number;
}

interface ReferralSourcesChartProps {
  data?: ReferralSourceData;
}

const COLORS = {
  'Direct Link': '#006c67',      // Tutorwise primary teal
  'QR Code': '#10b981',          // Emerald green
  'Embed Code': '#0891b2',       // Cyan
  'Social Share': '#14b8a6',     // Teal
};

const ReferralSourcesChart = memo(function ReferralSourcesChart({
  data = { 'Direct Link': 0, 'QR Code': 0, 'Embed Code': 0, 'Social Share': 0 }
}: ReferralSourcesChartProps) {
  // Prepare data for chart - memoized to prevent recalculation
  const chartData = useMemo(() => [
    { name: 'Direct Link', value: data['Direct Link'], color: COLORS['Direct Link'] },
    { name: 'QR Code', value: data['QR Code'], color: COLORS['QR Code'] },
    { name: 'Embed Code', value: data['Embed Code'], color: COLORS['Embed Code'] },
    { name: 'Social Share', value: data['Social Share'], color: COLORS['Social Share'] }
  ].filter(item => item.value > 0), [data]);

  const total = useMemo(() =>
    data['Direct Link'] + data['QR Code'] + data['Embed Code'] + data['Social Share'],
    [data]
  );
  const hasData = total > 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{payload[0].name}</p>
          <p className={styles.tooltipValue}>
            {payload[0].value} referrals ({percentage}%)
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
          <Share2 className={styles.icon} size={20} />
          <h3 className={styles.title}>Referral Sources</h3>
        </div>
      </div>

      <div className={styles.content}>
        {!hasData ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No referral source data available yet. Start sharing your referral link to see how your leads are finding you.</p>
          </div>
        ) : (
          <>
            {/* Pie Chart */}
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="42%"
                    labelLine={false}
                    label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={90}
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
            </div>

            {/* Stats Summary */}
            <div className={styles.statsSummary}>
              {chartData.map((item) => (
                <div key={item.name} className={styles.statItem}>
                  <div className={styles.statDot} style={{ backgroundColor: item.color }} />
                  <div className={styles.statContent}>
                    <span className={styles.statLabel}>{item.name}</span>
                    <span className={styles.statValue}>{item.value}</span>
                  </div>
                </div>
              ))}
              <div className={styles.statItem}>
                <div className={styles.statDot} style={{ backgroundColor: '#6b7280' }} />
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Total</span>
                  <span className={styles.statValue}>{total}</span>
                </div>
              </div>
            </div>

            {/* Insight */}
            {chartData.length > 0 && (
              <div className={styles.insight}>
                <p className={styles.insightText}>
                  Most referrals come from <strong>{chartData[0].name}</strong> ({((chartData[0].value / total) * 100).toFixed(0)}%)
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default ReferralSourcesChart;
