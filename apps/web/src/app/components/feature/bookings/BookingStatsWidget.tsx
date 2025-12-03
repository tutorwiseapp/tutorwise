/*
 * Filename: apps/web/src/app/components/feature/bookings/BookingStatsWidget.tsx
 * Purpose: A widget for the HubSidebar showing booking stats
 * Created: 2025-11-03
 * Updated: 2025-11-19 - Migrated to v2 design with HubStatsCard
 */
'use client';

import React from 'react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

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

  return <HubStatsCard title="Booking Stats" stats={stats} />;
};

export default BookingStatsWidget;
