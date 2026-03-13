/**
 * Filename: HubStatsCard.tsx
 * Purpose: Core Stats Card Shell - Reusable vertical stats pattern
 * Created: 2025-11-18
 * Design: context-sidebar-ui-design-v2.md Section 2.1
 *
 * Pattern A: Stats Card Pattern
 * - Vertical stack of label-value rows
 * - High contrast typography (Grey label, Black value)
 * - NO ICONS (professional aesthetic)
 */

'use client';

import React from 'react';
import styles from './HubStatsCard.module.css';

export interface StatRow {
  label: string;
  value: string | number;
  valueColor?: 'default' | 'green' | 'orange' | 'red' | 'black-bold';
}

interface SidebarStatsWidgetProps {
  title: string;
  stats: StatRow[];
  className?: string;
}

export default function HubStatsCard({
  title,
  stats,
  className = '',
}: SidebarStatsWidgetProps) {
  return (
    <div className={`${styles.statsWidget} ${className}`}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.statsContainer}>
        {stats.map((stat, index) => (
          <div key={index} className={styles.statRow}>
            <span className={styles.label}>{stat.label}</span>
            <span className={`${styles.value} ${styles[stat.valueColor || 'default']}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
