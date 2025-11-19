/**
 * Filename: apps/web/src/app/components/messages/InboxStatsWidget.tsx
 * Purpose: Inbox statistics widget for Messages Hub (v2 design)
 * Created: 2025-11-19
 * Design: Shows unread messages, active chats, and archived conversations
 *
 * Features:
 * - Unread Messages count (orange if > 0)
 * - Active Chats count (green if > 0)
 * - Archived count
 * - NO ICONS (clean professional look)
 */
'use client';

import React from 'react';
import SidebarStatsWidget, { StatRow } from '@/app/components/layout/sidebars/components/SidebarStatsWidget';

interface InboxStatsWidgetProps {
  unreadCount: number;
  activeChats: number;
  archivedCount: number;
}

export default function InboxStatsWidget({
  unreadCount,
  activeChats,
  archivedCount,
}: InboxStatsWidgetProps) {
  const statsData: StatRow[] = [
    {
      label: 'Unread Messages',
      value: unreadCount,
      valueColor: unreadCount > 0 ? 'orange' : 'default',
    },
    {
      label: 'Active Chats',
      value: activeChats,
      valueColor: activeChats > 0 ? 'green' : 'default',
    },
    {
      label: 'Archived',
      value: archivedCount,
      valueColor: 'default',
    },
  ];

  return <SidebarStatsWidget title="Inbox Status" stats={statsData} />;
}
