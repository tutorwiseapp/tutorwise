/**
 * Filename: ReferralRevenueTrends.tsx
 * Purpose: Line chart showing referral revenue trends over last 6 months
 * Created: 2025-12-07
 * Phase 3: Performance Dashboard
 */

'use client';

import React, { memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import styles from './ReferralRevenueTrends.module.css';

export interface MonthlyRevenue {
  month: string; // e.g., "Jan", "Feb", "Mar"
  revenue: number;
}

interface ReferralRevenueTrendsProps {
  data: MonthlyRevenue[];
  currency?: string;
}

const ReferralRevenueTrends = memo(function ReferralRevenueTrends({
  data = [],
  currency = 'GBP'
}: ReferralRevenueTrendsProps) {
  const formatCurrency = useMemo(() => {
    return (value: number) => new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, [currency]);

  const totalRevenue = useMemo(() =>
    data.reduce((sum, item) => sum + item.revenue, 0),
    [data]
  );

  const averageRevenue = useMemo(() =>
    data.length > 0 ? totalRevenue / data.length : 0,
    [totalRevenue, data.length]
  );

  // Calculate trend (comparing last month to previous month)
  const trend = useMemo(() => {
    if (data.length < 2) return null;
    const lastMonth = data[data.length - 1].revenue;
    const previousMonth = data[data.length - 2].revenue;
    if (previousMonth === 0) return null;
    return ((lastMonth - previousMonth) / previousMonth) * 100;
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p className={styles.tooltipValue} style={{ color: '#059669' }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasData = data.length > 0 && totalRevenue > 0;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <TrendingUp className={styles.icon} size={20} />
          <h3 className={styles.title}>Revenue Trends</h3>
        </div>
        {trend !== null && (
          <div className={`${styles.trendBadge} ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div className={styles.content}>
        {!hasData ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No revenue data available yet. Start earning commissions from your referrals to see your revenue trends.</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Total Revenue</span>
                <span className={styles.statValue}>{formatCurrency(totalRevenue)}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Monthly Average</span>
                <span className={styles.statValue}>{formatCurrency(averageRevenue)}</span>
              </div>
            </div>

            {/* Line Chart */}
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
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
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ fill: '#059669', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
});

export default ReferralRevenueTrends;
