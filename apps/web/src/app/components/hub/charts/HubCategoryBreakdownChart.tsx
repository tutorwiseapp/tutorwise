/**
 * Filename: HubCategoryBreakdownChart.tsx
 * Purpose: Generic bar chart for displaying category breakdown data
 * Created: 2025-12-17
 * Pattern: Reusable chart component (can be used for attribution, sources, types, etc.)
 */

'use client';

import React, { memo, useMemo } from 'react';
import styles from './HubCategoryBreakdownChart.module.css';

export interface CategoryData {
  label: string;
  value: number;
  color?: string;
}

export interface HubCategoryBreakdownChartProps {
  data: CategoryData[];
  title: string;
  subtitle?: string;
  type?: 'bar' | 'horizontal-bar';
  showPercentage?: boolean;
  showValue?: boolean;
}

const HubCategoryBreakdownChart = memo(function HubCategoryBreakdownChart({
  data,
  title,
  subtitle,
  type = 'horizontal-bar',
  showPercentage = true,
  showValue = true,
}: HubCategoryBreakdownChartProps) {
  // Calculate total for percentage
  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  // Default colors if not provided
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>{title}</h3>
        </div>
      </div>

      <div className={styles.content}>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        <div className={styles.categoriesContainer}>
          {data.map((category, index) => {
            const percentage = total > 0 ? (category.value / total) * 100 : 0;
            const barColor = category.color || defaultColors[index % defaultColors.length];

            return (
              <div key={category.label} className={styles.categoryRow}>
                <div className={styles.categoryInfo}>
                  <div className={styles.categoryLabel}>{category.label}</div>
                  <div className={styles.categoryStats}>
                    {showValue && <span className={styles.categoryValue}>{category.value}</span>}
                    {showPercentage && (
                      <span className={styles.categoryPercentage}>
                        ({percentage.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.barContainer}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default HubCategoryBreakdownChart;
