/**
 * Filename: HubCalendarHeatmap.tsx
 * Purpose: Reusable calendar heatmap showing booking/activity density
 * Created: 2025-12-18
 * Pattern: Widget with teal header - can be used across Dashboard, Organisation, and other hubs
 */

'use client';

import React, { memo, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import styles from './HubCalendarHeatmap.module.css';

export interface DayData {
  date: string; // ISO date string
  count: number; // Number of bookings/activities
  hours?: number; // Total hours (optional)
}

interface HubCalendarHeatmapProps {
  data?: DayData[];
  range?: 'next-7-days' | 'next-14-days';
  title?: string;
  subtitle?: string;
}

const HubCalendarHeatmap = memo(function HubCalendarHeatmap({
  data,
  range = 'next-14-days',
  title = 'Booking Calendar',
  subtitle
}: HubCalendarHeatmapProps) {
  const days = range === 'next-7-days' ? 7 : 14;

  // Auto-generate subtitle if not provided
  const displaySubtitle = subtitle || `Next ${days} days`;

  // Generate array of next N days - memoized to prevent recalculation
  const calendarDays = useMemo(() => {
    const result = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];

      // Find booking data for this day
      const dayData = data?.find(d => d.date === dateString) || { date: dateString, count: 0, hours: 0 };

      result.push({
        ...dayData,
        dayOfWeek: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayOfMonth: date.getDate(),
        isToday: i === 0,
      });
    }

    return result;
  }, [data, days]);

  // Get max count for normalization - memoized
  const maxCount = useMemo(() => {
    return Math.max(...calendarDays.map(d => d.count), 1);
  }, [calendarDays]);

  // Get intensity class based on booking count
  const getIntensityClass = (count: number) => {
    if (count === 0) return styles.intensity0;
    const percentage = (count / maxCount) * 100;
    if (percentage <= 25) return styles.intensity1;
    if (percentage <= 50) return styles.intensity2;
    if (percentage <= 75) return styles.intensity3;
    return styles.intensity4;
  };

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Calendar className={styles.icon} size={20} />
          <h3 className={styles.title}>{title}</h3>
        </div>
      </div>

      <div className={styles.content}>
        <p className={styles.subtitle}>{displaySubtitle}</p>

        <div className={styles.heatmap}>
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`${styles.day} ${getIntensityClass(day.count)} ${day.isToday ? styles.today : ''}`}
              title={`${day.dayOfWeek}, ${day.dayOfMonth}: ${day.count} booking${day.count !== 1 ? 's' : ''} ${day.hours ? `(${day.hours}h)` : ''}`}
            >
              <div className={styles.dayLabel}>{day.dayOfWeek}</div>
              <div className={styles.dayNumber}>{day.dayOfMonth}</div>
              <div className={styles.dayCount}>{day.count || '-'}</div>
            </div>
          ))}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendLabel}>Less</span>
          <div className={`${styles.legendBox} ${styles.intensity0}`}></div>
          <div className={`${styles.legendBox} ${styles.intensity1}`}></div>
          <div className={`${styles.legendBox} ${styles.intensity2}`}></div>
          <div className={`${styles.legendBox} ${styles.intensity3}`}></div>
          <div className={`${styles.legendBox} ${styles.intensity4}`}></div>
          <span className={styles.legendLabel}>More</span>
        </div>
      </div>
    </div>
  );
});

export default HubCalendarHeatmap;
