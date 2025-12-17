/**
 * Filename: apps/web/src/app/components/hub/layout/cards/HubTabs.tsx
 * Purpose: Reusable tab navigation for Hub Pages matching Bookings style
 * Created: 2025-11-28
 * Pattern: Underline tabs with teal active state, full-width with overflow scroll
 *
 * Usage:
 * <HubTabs
 *   tabs={[
 *     { id: 'all', label: 'All Listings', count: 10, active: true },
 *     { id: 'published', label: 'Published', count: 5, active: false },
 *   ]}
 *   onTabChange={(tabId) => handleFilterChange(tabId)}
 * />
 */

'use client';

import React from 'react';
import styles from './HubTabs.module.css';

export interface HubTab {
  id: string;
  label: string;
  count?: number;
  active: boolean;
}

interface HubTabsProps {
  tabs: HubTab[];
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function HubTabs({ tabs, onTabChange, className }: HubTabsProps) {
  return (
    <div className={`${styles.filterTabsContainer} ${className || ''}`}>
      <div className={styles.filterTabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${styles.filterTab} ${tab.active ? styles.filterTabActive : ''}`}
          >
            {tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </button>
        ))}
      </div>
    </div>
  );
}
