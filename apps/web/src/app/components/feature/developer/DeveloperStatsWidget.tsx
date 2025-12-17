/**
 * Filename: DeveloperStatsWidget.tsx
 * Purpose: Display API key statistics in HubSidebar
 * Created: 2025-12-17
 */
'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface ApiKey {
  id: string;
  is_active: boolean;
  total_requests: number;
  revoked_at: string | null;
  expires_at: string | null;
}

interface DeveloperStatsWidgetProps {
  apiKeys: ApiKey[];
  isLoading: boolean;
}

export default function DeveloperStatsWidget({ apiKeys, isLoading }: DeveloperStatsWidgetProps) {
  const getKeyStatus = (key: ApiKey): string => {
    if (key.revoked_at) return 'Revoked';
    if (key.expires_at && new Date(key.expires_at) < new Date()) return 'Expired';
    if (!key.is_active) return 'Inactive';
    return 'Active';
  };

  const stats: StatRow[] = [
    {
      label: 'Total Keys',
      value: isLoading ? '...' : apiKeys.length,
      valueColor: 'default',
    },
    {
      label: 'Active Keys',
      value: isLoading ? '...' : apiKeys.filter(k => getKeyStatus(k) === 'Active').length,
      valueColor: 'green',
    },
    {
      label: 'Total Requests',
      value: isLoading ? '...' : apiKeys.reduce((sum, k) => sum + k.total_requests, 0).toLocaleString(),
      valueColor: 'default',
    },
  ];

  return <HubStatsCard title="API Statistics" stats={stats} />;
}
