/**
 * Filename: HubWidgetCard.tsx
 * Purpose: Dashboard section wrapper for monitoring/operational widgets
 * Created: 2026-03-14
 * Pattern: Header (icon + title + badge + actions) + content area
 *
 * Standardizes the section card pattern used across MonitoringPanel,
 * Operations Overview, and other dashboard-style pages.
 *
 * Usage:
 * <HubWidgetCard title="Pending Approvals" icon={UserCheck} badge={3} onRefresh={refetch}>
 *   <HubDataTable compact columns={...} data={...} />
 * </HubWidgetCard>
 */

'use client';

import React from 'react';
import { RefreshCw, type LucideIcon } from 'lucide-react';
import styles from './HubWidgetCard.module.css';

export interface HubWidgetCardProps {
  title: string;
  icon?: LucideIcon;
  badge?: number;
  badgeVariant?: 'default' | 'amber' | 'red';
  headerAction?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
  /** Remove content padding — use for tables that need flush edges */
  flush?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function HubWidgetCard({
  title,
  icon: Icon,
  badge,
  badgeVariant = 'default',
  headerAction,
  onRefresh,
  refreshing = false,
  loading = false,
  flush = false,
  children,
  className = '',
}: HubWidgetCardProps) {
  return (
    <div className={`${styles.card} ${flush ? styles.flush : ''} ${className}`}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          {Icon && <Icon size={14} className={styles.icon} />}
          <span className={styles.title}>{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className={`${styles.badge} ${styles[`badge_${badgeVariant}`]}`}>
              {badge}
            </span>
          )}
        </div>
        <div className={styles.actions}>
          {headerAction}
          {onRefresh && (
            <button
              className={`${styles.refreshBtn} ${refreshing ? styles.refreshing : ''}`}
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
