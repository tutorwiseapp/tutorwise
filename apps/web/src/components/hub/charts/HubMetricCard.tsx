/**
 * Filename: HubMetricCard.tsx
 * Purpose: Compact KPI card for dense data pages (Intelligence, analytics)
 * Created: 2026-03-14
 * Pattern: Value-first, no header band — designed for 4-6 cards per row
 *
 * Use HubKPICard for dashboards/overviews (3-4 cards, teal header, icon).
 * Use HubMetricCard for dense data pages (6-8+ cards, compact, scan-friendly).
 */

'use client';

import React from 'react';
import styles from './HubMetricCard.module.css';

export interface HubMetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  className?: string;
}

export default function HubMetricCard({
  label,
  value,
  sublabel,
  className,
}: HubMetricCardProps) {
  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {sublabel && <div className={styles.sublabel}>{sublabel}</div>}
    </div>
  );
}
