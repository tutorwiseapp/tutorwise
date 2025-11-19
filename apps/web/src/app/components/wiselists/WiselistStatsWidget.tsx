/**
 * Filename: WiselistStatsWidget.tsx
 * Purpose: Display wiselist statistics in sidebar (v5.7)
 * Path: /app/components/wiselists/WiselistStatsWidget.tsx
 * Created: 2025-11-15
 * Updated: 2025-11-19 - Migrated to v2 design with SidebarStatsWidget
 */

'use client';

import React, { useEffect, useState } from 'react';
import SidebarStatsWidget, { StatRow } from '@/app/components/layout/sidebars/components/SidebarStatsWidget';

interface WiselistStats {
  total_wiselists: number;
  public_wiselists: number;
  total_items: number;
  total_collaborators: number;
}

export function WiselistStatsWidget() {
  const [stats, setStats] = useState<WiselistStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/wiselists');
      if (!response.ok) throw new Error('Failed to fetch wiselists');

      const { wiselists } = await response.json();

      // Calculate stats
      const stats: WiselistStats = {
        total_wiselists: wiselists.length,
        public_wiselists: wiselists.filter((w: any) => w.visibility === 'public').length,
        total_items: wiselists.reduce((sum: number, w: any) => sum + (w.item_count || 0), 0),
        total_collaborators: wiselists.reduce((sum: number, w: any) => sum + (w.collaborator_count || 0), 0),
      };

      setStats(stats);
    } catch (error) {
      console.error('Fetch wiselist stats error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statsData: StatRow[] = [
    {
      label: 'Total Wiselists',
      value: stats?.total_wiselists ?? 0,
      valueColor: 'default',
    },
    {
      label: 'Public',
      value: stats?.public_wiselists ?? 0,
      valueColor: stats?.public_wiselists && stats.public_wiselists > 0 ? 'green' : 'default',
    },
    {
      label: 'Total Items',
      value: stats?.total_items ?? 0,
      valueColor: 'default',
    },
  ];

  return <SidebarStatsWidget title="Your Wiselists" stats={statsData} />;
}
