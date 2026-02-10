/**
 * Filename: StudentStatsWidget.tsx
 * Purpose: Student portfolio statistics widget using HubStatsCard shell
 * Created: 2026-02-09
 * Updated: 2026-02-10 - Migrated to HubStatsCard (matches BookingStatsWidget pattern)
 */

'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface StudentStat {
  totalStudents: number;
  profileComplete: number;
  profileIncomplete: number;
  preferencesSet: number;
  preferencesMissing: number;
  needsAttention: number;
  pendingInvitations: number;
  addedThisMonth: number;
}

interface StudentStatsWidgetProps {
  stats: StudentStat;
  isLoading?: boolean;
}

export default function StudentStatsWidget({ stats, isLoading }: StudentStatsWidgetProps) {
  if (isLoading) {
    return <HubStatsCard title="Student Portfolio" stats={[{ label: 'Loading...', value: '—' }]} />;
  }

  const rows: StatRow[] = [];

  // Active students count
  rows.push({
    label: 'Active Students',
    value: stats.totalStudents,
    valueColor: 'default',
  });

  if (stats.totalStudents === 0) {
    // Empty state — just show pending invitations if any
    if (stats.pendingInvitations > 0) {
      rows.push({
        label: 'Invitations Sent',
        value: stats.pendingInvitations,
        valueColor: 'orange',
      });
    }
  } else {
    // Students present — show full breakdown
    if (stats.addedThisMonth > 0) {
      rows.push({
        label: 'Added This Month',
        value: stats.addedThisMonth,
        valueColor: 'green',
      });
    }

    rows.push({
      label: 'Profile Complete',
      value: stats.profileComplete,
      valueColor: stats.profileComplete > 0 ? 'green' : 'default',
    });

    if (stats.profileIncomplete > 0) {
      rows.push({
        label: 'Profile Incomplete',
        value: stats.profileIncomplete,
        valueColor: 'orange',
      });
    }

    rows.push({
      label: 'Preferences Set',
      value: stats.preferencesSet,
      valueColor: stats.preferencesSet > 0 ? 'green' : 'default',
    });

    if (stats.preferencesMissing > 0) {
      rows.push({
        label: 'Preferences Missing',
        value: stats.preferencesMissing,
        valueColor: 'default',
      });
    }

    if (stats.needsAttention > 0) {
      rows.push({
        label: 'Needs Attention',
        value: stats.needsAttention,
        valueColor: 'orange',
      });
    }

    if (stats.pendingInvitations > 0) {
      rows.push({
        label: 'Invitations Sent',
        value: stats.pendingInvitations,
        valueColor: 'default',
      });
    }
  }

  return <HubStatsCard title="Student Portfolio" stats={rows} />;
}
