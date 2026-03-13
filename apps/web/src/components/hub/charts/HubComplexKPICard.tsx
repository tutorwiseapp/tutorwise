/**
 * Filename: HubComplexKPICard.tsx
 * Purpose: Complex KPI card for displaying detailed information beyond simple metrics
 * Path: /app/components/hub/charts/HubComplexKPICard.tsx
 * Created: 2026-02-26
 *
 * Use Cases:
 * - Agent status cards (CAS dashboard)
 * - AI model cards (Sage dashboard)
 * - Persona cards (Lexi dashboard)
 * - Provider cards (Runtime selection)
 *
 * Design:
 * - Icon + Status badge header
 * - Title + Description
 * - Multiple stats (2-4 recommended)
 * - Optional click handler
 * - Responsive grid layout
 */

'use client';

import React from 'react';
import styles from './HubComplexKPICard.module.css';

export interface HubComplexKPICardStat {
  label: string;
  value: string | number;
}

export interface HubComplexKPICardProps {
  /** Icon element (React node from lucide-react or similar) */
  icon: React.ReactNode;

  /** Card title (e.g., "Marketer", "Claude Sonnet", "Student Persona") */
  title: string;

  /** Card description (1-2 sentences) */
  description: string;

  /** Optional status badge */
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'neutral';
  };

  /** Array of stats to display at bottom (2-4 recommended) */
  stats: HubComplexKPICardStat[];

  /** Optional click handler */
  onClick?: () => void;

  /** Optional CSS class name */
  className?: string;
}

export default function HubComplexKPICard({
  icon,
  title,
  description,
  status,
  stats,
  onClick,
  className = '',
}: HubComplexKPICardProps) {
  const cardClasses = [
    styles.card,
    onClick ? styles.clickable : '',
    className,
  ].filter(Boolean).join(' ');

  const statusClasses = [
    styles.statusBadge,
    status?.variant ? styles[`status${capitalize(status.variant)}`] : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header: Icon + Status */}
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          {icon}
        </div>
        {status && (
          <span className={statusClasses}>
            {status.label}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className={styles.title}>{title}</h3>

      {/* Description */}
      <p className={styles.description}>{description}</p>

      {/* Stats */}
      {stats.length > 0 && (
        <div className={styles.stats}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.stat}>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statValue}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
