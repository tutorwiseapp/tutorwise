/**
 * Filename: SageStatsWidget.tsx
 * Purpose: Sage Pro usage stats sidebar widget
 * Created: 2026-02-22
 *
 * Displays: Questions Used, Questions Remaining, Storage Used, Storage Remaining
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface SageStatsWidgetProps {
  questionsUsed: number;
  questionsQuota: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default function SageStatsWidget({
  questionsUsed,
  questionsQuota,
  storageUsedBytes,
  storageQuotaBytes,
  className,
}: SageStatsWidgetProps) {
  const questionsRemaining = Math.max(0, questionsQuota - questionsUsed);
  const storageRemaining = Math.max(0, storageQuotaBytes - storageUsedBytes);

  const stats: StatRow[] = [
    {
      label: 'Questions Used',
      value: `${questionsUsed.toLocaleString()} / ${questionsQuota.toLocaleString()}`,
    },
    {
      label: 'Questions Remaining',
      value: questionsRemaining.toLocaleString(),
      valueColor: questionsRemaining === 0 ? 'red' : 'black-bold',
    },
    {
      label: 'Storage Used',
      value: `${formatBytes(storageUsedBytes)} / ${formatBytes(storageQuotaBytes)}`,
    },
    {
      label: 'Storage Remaining',
      value: formatBytes(storageRemaining),
      valueColor: storageRemaining === 0 ? 'red' : 'black-bold',
    },
  ];

  return (
    <HubStatsCard
      title="Sage Pro Usage"
      stats={stats}
      className={className}
    />
  );
}
