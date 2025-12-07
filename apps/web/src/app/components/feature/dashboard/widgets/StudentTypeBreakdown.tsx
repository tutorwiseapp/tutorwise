/**
 * Filename: StudentTypeBreakdown.tsx
 * Purpose: Chart showing breakdown of new vs returning students
 * Created: 2025-12-07
 */

'use client';

import React, { memo, useMemo, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Users, BarChart3, PieChartIcon } from 'lucide-react';
import styles from './StudentTypeBreakdown.module.css';

export interface StudentTypeData {
  new: number;
  returning: number;
}

interface StudentTypeBreakdownProps {
  data?: StudentTypeData;
  defaultView?: 'pie' | 'bar';
}

const StudentTypeBreakdown = memo(function StudentTypeBreakdown({
  data = { new: 0, returning: 0 },
  defaultView = 'pie'
}: StudentTypeBreakdownProps) {
  const [viewType, setViewType] = useState<'pie' | 'bar'>(defaultView);

  // Prepare data for charts - memoized to prevent recalculation
  const chartData = useMemo(() => [
    { name: 'New Students', value: data.new, color: '#2563EB' },
    { name: 'Returning Students', value: data.returning, color: '#059669' }
  ], [data.new, data.returning]);

  const total = useMemo(() => data.new + data.returning, [data.new, data.returning]);
  const hasData = total > 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
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

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Users className={styles.icon} size={20} />
          <h3 className={styles.title}>Student Type Breakdown</h3>
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
            <p className={styles.emptyText}>No student data available yet. Start booking sessions to see your student breakdown.</p>
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
                  <span className={styles.statValue}>{data.new}</span>
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statDot} style={{ backgroundColor: '#059669' }} />
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Returning Students</span>
                  <span className={styles.statValue}>{data.returning}</span>
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statDot} style={{ backgroundColor: '#6b7280' }} />
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Total</span>
                  <span className={styles.statValue}>{total}</span>
                </div>
              </div>
            </div>

            {/* Insight */}
            {data.returning > 0 && (
              <div className={styles.insight}>
                <p className={styles.insightText}>
                  <strong>{((data.returning / total) * 100).toFixed(0)}%</strong> of your students are returning -
                  {data.returning / total > 0.5 ? ' excellent retention!' : ' focus on building long-term relationships.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default StudentTypeBreakdown;
