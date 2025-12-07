/**
 * Filename: BookingCalendarHeatmap.tsx
 * Purpose: Visual heatmap showing booking density for next 14 days
 * Created: 2025-12-07
 */

'use client';

import React from 'react';
import styles from './BookingCalendarHeatmap.module.css';

export interface DayBooking {
  date: string; // ISO date string
  count: number; // Number of bookings
  hours: number; // Total hours
}

interface BookingCalendarHeatmapProps {
  data: DayBooking[];
  range?: 'next-7-days' | 'next-14-days';
}

export default function BookingCalendarHeatmap({
  data,
  range = 'next-14-days'
}: BookingCalendarHeatmapProps) {
  const days = range === 'next-7-days' ? 7 : 14;

  // Generate array of next N days
  const generateDays = () => {
    const result = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];

      // Find booking data for this day
      const dayData = data.find(d => d.date === dateString) || { date: dateString, count: 0, hours: 0 };

      result.push({
        ...dayData,
        dayOfWeek: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayOfMonth: date.getDate(),
        isToday: i === 0,
      });
    }

    return result;
  };

  const calendarDays = generateDays();

  // Get max count for normalization
  const maxCount = Math.max(...calendarDays.map(d => d.count), 1);

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
    <div className={styles.chartContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>Booking Calendar</h3>
        <p className={styles.subtitle}>Next {days} days</p>
      </div>

      <div className={styles.heatmap}>
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`${styles.day} ${getIntensityClass(day.count)} ${day.isToday ? styles.today : ''}`}
            title={`${day.dayOfWeek}, ${day.dayOfMonth}: ${day.count} booking${day.count !== 1 ? 's' : ''} (${day.hours}h)`}
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
  );
}
