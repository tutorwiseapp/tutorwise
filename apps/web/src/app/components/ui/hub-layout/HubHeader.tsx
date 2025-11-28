/**
 * Filename: apps/web/src/app/components/ui/hub-layout/HubHeader.tsx
 * Purpose: Ultra-Dense Header for Hub Pages with Title, Filters, and Actions
 * Created: 2025-11-28
 * Updated: 2025-11-28 - Converted to CSS Modules for consistency
 * Pattern: Two-row layout - Row 1: Title + Actions | Row 2: Filters (centered)
 *
 * Usage:
 * <HubHeader
 *   title="Listings"
 *   subtitle="Manage your service offerings"
 *   filters={<>Search + Sort</>}
 *   actions={<Button>+ Create</Button>}
 * />
 */

'use client';

import React, { ReactNode } from 'react';
import styles from './HubHeader.module.css';

interface HubHeaderProps {
  title: string;
  subtitle?: string;
  filters?: ReactNode; // Optional centered filters row (search/sort)
  actions?: ReactNode; // Right slot (buttons/menu)
}

export default function HubHeader({ title, subtitle, filters, actions }: HubHeaderProps) {
  return (
    <header className={styles.header}>
      {/* Row 1: Title + Actions */}
      <div className={styles.headerRow}>
        {/* Left: Title + Subtitle */}
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            {title}
          </h1>
          {subtitle && (
            <p className={styles.subtitle}>
              {subtitle}
            </p>
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
          <div className={styles.filtersInner}>
            {filters}
          </div>
        </div>
      )}
    </header>
  );
}
