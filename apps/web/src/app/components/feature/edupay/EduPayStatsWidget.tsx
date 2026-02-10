/**
 * Filename: EduPayStatsWidget.tsx
 * Purpose: EduPay wallet stats sidebar widget
 * Created: 2026-02-10
 * Shell: HubStatsCard
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';
import type { EduPayWallet } from '@/lib/api/edupay';

interface EduPayStatsWidgetProps {
  wallet: EduPayWallet | null;
}

export default function EduPayStatsWidget({ wallet }: EduPayStatsWidgetProps) {
  const availableEp = wallet?.available_ep ?? 0;
  const pendingEp = wallet?.pending_ep ?? 0;
  const convertedEp = wallet?.converted_ep ?? 0;

  const rows: StatRow[] = [
    {
      label: 'EP Balance',
      value: availableEp.toLocaleString(),
      valueColor: 'default',
    },
    {
      label: 'GBP Value',
      value: `£${(availableEp / 100).toFixed(2)}`,
      valueColor: availableEp > 0 ? 'green' : 'default',
    },
    {
      label: 'Pending EP',
      value: pendingEp.toLocaleString(),
      valueColor: pendingEp > 0 ? 'orange' : 'default',
    },
    {
      label: 'Total Converted',
      value: `£${(convertedEp / 100).toFixed(2)}`,
      valueColor: 'default',
    },
  ];

  return <HubStatsCard title="EduPay Wallet" stats={rows} />;
}
