/**
 * Filename: EduPaySavingsWidget.tsx
 * Purpose: EduPay savings summary sidebar widget
 * Created: 2026-02-11
 * Shell: HubStatsCard
 *
 * Shows user's ISA/Savings allocations with projected interest
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';
import type { SavingsSummary } from '@/lib/api/edupay';

interface EduPaySavingsWidgetProps {
  summary: SavingsSummary | null;
}

export default function EduPaySavingsWidget({ summary }: EduPaySavingsWidgetProps) {
  // Don't show widget if user has no savings allocations
  if (!summary || summary.allocation_count === 0) {
    return null;
  }

  const { total_gbp_allocated, total_projected_interest, total_with_interest, allocation_count } = summary;

  const rows: StatRow[] = [
    {
      label: 'Allocated',
      value: `£${total_gbp_allocated.toFixed(2)}`,
      valueColor: 'default',
    },
    {
      label: 'Projected Interest',
      value: `+£${total_projected_interest.toFixed(2)}`,
      valueColor: 'green',
    },
    {
      label: 'Total Value',
      value: `£${total_with_interest.toFixed(2)}`,
      valueColor: 'green',
    },
    {
      label: 'Accounts',
      value: allocation_count.toString(),
      valueColor: 'default',
    },
  ];

  return <HubStatsCard title="Savings & ISA" stats={rows} />;
}
