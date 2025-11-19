/**
 * Filename: OrganisationStatsWidget.tsx
 * Purpose: Organisation performance stats sidebar widget (v6.1)
 * Created: 2025-11-19
 * Design: context-sidebar-ui-design-v2.md Section 2.12
 *
 * Displays: Team Size, Total Clients, Monthly Revenue
 */

'use client';

import React from 'react';
import SidebarStatsWidget, { StatRow } from '@/app/components/layout/sidebars/components/SidebarStatsWidget';

interface OrganisationStatsWidgetProps {
  teamSize: number;
  totalClients: number;
  monthlyRevenue: number;
  className?: string;
}

export default function OrganisationStatsWidget({
  teamSize,
  totalClients,
  monthlyRevenue,
  className,
}: OrganisationStatsWidgetProps) {
  const stats: StatRow[] = [
    {
      label: 'Team Size',
      value: teamSize,
    },
    {
      label: 'Total Clients',
      value: totalClients,
    },
    {
      label: 'Monthly Revenue',
      value: `£${monthlyRevenue.toFixed(2)}`,
      valueColor: 'black-bold',
    },
  ];

  return (
    <SidebarStatsWidget
      title="Organisation Performance"
      stats={stats}
      className={className}
    />
  );
}
