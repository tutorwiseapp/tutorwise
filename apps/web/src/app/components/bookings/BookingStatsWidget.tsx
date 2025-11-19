/*
 * Filename: apps/web/src/app/components/bookings/BookingStatsWidget.tsx
 * Purpose: A widget for the ContextualSidebar showing booking stats
 * Created: 2025-11-03
 * Updated: 2025-11-19 - Migrated to v2 design with SidebarStatsWidget
 */
'use client';

import React from 'react';
import SidebarStatsWidget, { StatRow } from '@/app/components/layout/sidebars/components/SidebarStatsWidget';

interface BookingStatsWidgetProps {
  pending?: number;
  upcoming?: number;
  completed?: number;
}

export const BookingStatsWidget: React.FC<BookingStatsWidgetProps> = ({
  pending = 0,
  upcoming = 0,
  completed = 0,
}) => {
  const stats: StatRow[] = [
    {
      label: 'Pending Confirmation',
      value: pending,
      valueColor: pending > 0 ? 'orange' : 'default',
    },
    {
      label: 'Upcoming Sessions',
      value: upcoming,
      valueColor: upcoming > 0 ? 'green' : 'default',
    },
    {
      label: 'Completed Sessions',
      value: completed,
      valueColor: 'default',
    },
  ];

  return <SidebarStatsWidget title="Booking Stats" stats={stats} />;
};

export default BookingStatsWidget;
