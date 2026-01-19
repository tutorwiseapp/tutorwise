/**
 * Filename: ListingsStatsWidget.tsx
 * Purpose: Stats widget for create listing sidebar
 * Created: 2026-01-19
 * Design: Uses HubStatsCard for consistent stats display
 */
'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

// Show all zeros since this is create page (no listings created yet)
const statsData: StatRow[] = [
  { label: 'Total', value: 0, valueColor: 'default' },
  { label: 'Published', value: 0, valueColor: 'default' },
  { label: 'Unpublished', value: 0, valueColor: 'default' },
  { label: 'Drafts', value: 0, valueColor: 'default' },
  { label: 'Archived', value: 0, valueColor: 'default' },
];

export default function ListingsStatsWidget() {
  return <HubStatsCard title="Listing Stats" stats={statsData} />;
}
