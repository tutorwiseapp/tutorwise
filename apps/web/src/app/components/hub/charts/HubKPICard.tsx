/**
 * Filename: HubKPICard.tsx
 * Purpose: Reusable KPI card component for hub pages (Dashboard, Organisation, etc.)
 * Created: 2025-12-17
 * Pattern: Icon + Label + Value + Change/Sublabel + Timeframe
 *
 * 100% API compatible with Dashboard KPICard for drop-in replacement
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './HubKPICard.module.css';

export interface HubKPICardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  change?: string;
  timeframe?: string;
  icon?: LucideIcon;
  variant?: 'success' | 'info' | 'warning' | 'neutral';
  clickable?: boolean;
  href?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function HubKPICard({
  label,
  value,
  sublabel,
  change,
  timeframe,
  icon: Icon,
  variant = 'neutral',
  clickable = false,
  href,
  trend
}: HubKPICardProps) {
  const content = (
    <div className={`${styles.card} ${styles[variant]} ${clickable ? styles.clickable : ''}`}>
      {/* Header with teal background */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {Icon && <Icon className={styles.icon} size={20} />}
          <span className={styles.label}>{label}</span>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Main Value with Trend Arrow */}
        <div className={styles.valueRow}>
          <div className={styles.value}>{value}</div>
          {trend && (
            <div className={styles.trendIndicator}>
              {trend === 'up' && <TrendingUp className={styles.trendUp} />}
              {trend === 'down' && <TrendingDown className={styles.trendDown} />}
              {trend === 'neutral' && <Minus className={styles.trendNeutral} />}
            </div>
          )}
        </div>

        {/* Sublabel (secondary info) */}
        {sublabel && <div className={styles.sublabel}>{sublabel}</div>}

        {/* Change indicator (e.g., "+12% vs last month") */}
        {change && (
          <div className={`${styles.change} ${change.startsWith('+') ? styles.positive : styles.negative}`}>
            {change}
          </div>
        )}

        {/* Timeframe (e.g., "This Month") */}
        {timeframe && <div className={styles.timeframe}>{timeframe}</div>}
      </div>
    </div>
  );

  if (clickable && href) {
    return <Link href={href} className={styles.link}>{content}</Link>;
  }

  return content;
}
