/**
 * Filename: apps/web/src/app/components/ui/hub-layout/HubTabs.tsx
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

export interface HubTab {
  id: string;
  label: string;
  count?: number;
  active: boolean;
}

interface HubTabsProps {
  tabs: HubTab[];
  onTabChange: (tabId: string) => void;
}

export default function HubTabs({ tabs, onTabChange }: HubTabsProps) {
  return (
    <div className="flex gap-2 px-8 py-0 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
            tab.active
              ? 'text-teal-600 border-teal-600'
              : 'text-gray-600 hover:text-gray-900 border-transparent'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  );
}
