/**
 * Filename: apps/web/src/app/components/hub/layout/cards/HubHeader.tsx
 * Purpose: Header for Hub Pages with Title, Filters, and Actions
 * Created: 2025-11-28
 * Updated: 2025-11-29 - Optimized spacing: HubHeader→Tabs 8px (0.5rem)
 * Pattern: Two-row layout - Row 1: Title + Actions | Row 2: Filters (centered)
 *
 * Usage:
 * <HubHeader
 *   title="Listings"
 *   filters={<>Search + Sort</>}  // Filters are centered horizontally
 *   actions={<Button>+ Create</Button>}
 * />
 *
 * Note: Filter children should NOT have width: 100% - let them size naturally for centering
 */

'use client';

import React, { ReactNode } from 'react';
import styles from './HubHeader.module.css';

interface HubHeaderProps {
  title: string | ReactNode;
  subtitle?: string; // Optional subtitle below title
  filters?: ReactNode; // Optional centered filters row (search/sort)
  actions?: ReactNode; // Right slot (buttons/menu)
  className?: string; // Optional custom className for headerRow
}

export default function HubHeader({ title, subtitle, filters, actions, className }: HubHeaderProps) {
  return (
    <header className={`${styles.header} ${className || ''}`}>
      {/* Row 1: Title + Actions */}
      <div className={styles.headerRow}>
        {/* Left: Title */}
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            {title}
          </h1>
          {subtitle && (
            <p className={styles.subtitle}>{subtitle}</p>
          )}
        </div>

        {/* Right: Actions (optional) */}
        {actions && (
          <div className={styles.actionsSection}>
            {actions}
          </div>
        )}
      </div>

      {/* Row 2: Filters (centered, optional) */}
      {filters && (
        <div className={styles.filtersRow}>
          {filters}
        </div>
      )}
    </header>
  );
}
