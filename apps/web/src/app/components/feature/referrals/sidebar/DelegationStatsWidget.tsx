/**
 * Filename: DelegationStatsWidget.tsx
 * Purpose: Stats widget for referral preferences sidebar showing delegation metrics
 * Created: 2025-12-18
 * Pattern: Uses HubStatsCard shell (same as ReferralStatsWidget)
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface DelegationStatsWidgetProps {
  profileDefaultSet: boolean;
  totalListings: number;
  listingsWithOverrides: number;
  listingsUsingDefault: number;
}

export default function DelegationStatsWidget({
  profileDefaultSet,
  totalListings,
  listingsWithOverrides,
  listingsUsingDefault,
}: DelegationStatsWidgetProps) {
  const statsRows: StatRow[] = [
    { label: 'Total Listings', value: totalListings, valueColor: 'default' },
    { label: 'Profile Default', value: profileDefaultSet ? 'Set' : 'Not Set', valueColor: profileDefaultSet ? 'green' : 'default' },
    { label: 'Using Default', value: listingsUsingDefault, valueColor: 'default' },
    { label: 'Overrides', value: listingsWithOverrides, valueColor: listingsWithOverrides > 0 ? 'green' : 'default' },
  ];

  return <HubStatsCard title="Delegation Stats" stats={statsRows} />;
}
