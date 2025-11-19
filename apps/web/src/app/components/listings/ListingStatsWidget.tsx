/*
 * Filename: src/app/components/listings/ListingStatsWidget.tsx
 * Purpose: Display listing statistics in ContextualSidebar
 * Created: 2025-11-03
 * Updated: 2025-11-19 - Migrated to v2 design with SidebarStatsWidget
 *
 * FIXED: Race condition where independent data fetching caused cards to disappear
 * Now receives listings as props from parent page for consistent state management
 */
'use client';

import React, { useMemo } from 'react';
import SidebarStatsWidget, { StatRow } from '@/app/components/layout/sidebars/components/SidebarStatsWidget';
import type { Listing } from '@tutorwise/shared-types';

interface ListingStatsWidgetProps {
  listings: Listing[];
  isLoading: boolean;
}

export default function ListingStatsWidget({ listings, isLoading }: ListingStatsWidgetProps) {
  // Calculate stats from props - use useMemo to avoid recalculation on every render
  const stats = useMemo(() => {
    // Filter out templates and calculate stats
    const regularListings = listings.filter(l => !l.is_template);

    return {
      total: regularListings.length,
      published: regularListings.filter(l => l.status === 'published').length,
      unpublished: regularListings.filter(l => l.status === 'unpublished').length,
      drafts: regularListings.filter(l => l.status === 'draft').length,
      archived: regularListings.filter(l => l.status === 'archived').length,
    };
  }, [listings]);

  const statsData: StatRow[] = [
    {
      label: 'Total',
      value: stats.total,
      valueColor: 'default',
    },
    {
      label: 'Published',
      value: stats.published,
      valueColor: stats.published > 0 ? 'green' : 'default',
    },
    {
      label: 'Unpublished',
      value: stats.unpublished,
      valueColor: 'default',
    },
    {
      label: 'Drafts',
      value: stats.drafts,
      valueColor: stats.drafts > 0 ? 'orange' : 'default',
    },
    {
      label: 'Archived',
      value: stats.archived,
      valueColor: 'default',
    },
  ];

  return <SidebarStatsWidget title="Listing Stats" stats={statsData} />;
}
