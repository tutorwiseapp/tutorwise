/**
 * Filename: apps/web/src/app/components/referrals/ReferralStatsWidget.tsx
 * Purpose: Referral statistics widget using SidebarStatsWidget shell
 * Created: 2025-11-18
 * Design: context-sidebar-ui-design-v2.md Section 2.4
 *
 * Pattern: Uses SidebarStatsWidget shell (same as NetworkStatsWidget)
 * Stats Shown:
 * - Referred
 * - Signed Up
 * - Converted
 */

'use client';

import React from 'react';
import SidebarStatsWidget, { StatRow } from '@/app/components/layout/sidebars/components/SidebarStatsWidget';

interface ReferralStatsWidgetProps {
  totalReferred: number;
  signedUp: number;
  converted: number;
}

export default function ReferralStatsWidget({
  totalReferred,
  signedUp,
  converted,
}: ReferralStatsWidgetProps) {
  // Build stats rows following design spec (Section 2.4)
  const statsRows: StatRow[] = [
    {
      label: 'Referred',
      value: totalReferred,
      valueColor: 'default',
    },
    {
      label: 'Signed Up',
      value: signedUp,
      valueColor: 'default',
    },
    {
      label: 'Converted',
      value: converted,
      valueColor: 'default',
    },
  ];

  return (
    <SidebarStatsWidget
      title="Referral Stats"
      stats={statsRows}
    />
  );
}
