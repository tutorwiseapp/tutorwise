/**
 * Filename: AdminStatsWidget.tsx
 * Purpose: Generic admin stats widget - reusable across all admin pages
 * Created: 2025-12-23
 * Design: Wraps HubStatsCard for admin-specific stats display
 * Specification: Admin Dashboard Solution Design v2, Section 3.3
 *
 * Usage:
 * <AdminStatsWidget
 *   title="Hub Statistics"
 *   stats={[
 *     { label: 'Total Hubs', value: 42 },
 *     { label: 'Published', value: 35, valueColor: 'green' },
 *     { label: 'Draft', value: 7, valueColor: 'orange' },
 *   ]}
 * />
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface AdminStatsWidgetProps {
  title: string;
  stats: StatRow[];
}

export default function AdminStatsWidget({ title, stats }: AdminStatsWidgetProps) {
  return <HubStatsCard title={title} stats={stats} />;
}
