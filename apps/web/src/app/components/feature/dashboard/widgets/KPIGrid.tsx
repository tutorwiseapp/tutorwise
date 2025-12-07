/**
 * Filename: KPIGrid.tsx
 * Purpose: Grid container for KPI cards with role-specific metrics
 * Created: 2025-12-07
 */

'use client';

import React from 'react';
import { Calendar, CheckCircle, Star, Users, Award, TrendingUp, Coins, Clock, Heart, MessageSquare } from 'lucide-react';
import KPICard, { KPICardProps } from './KPICard';
import styles from './KPIGrid.module.css';

export interface KPIData {
  totalEarnings: number;
  upcomingSessions: number;
  upcomingHours: number;
  completedSessionsThisMonth: number;
  averageRating: number;
  totalReviews: number;
  last10Rating?: number;
  repeatStudentsPercent?: number;
  repeatStudentsCount?: number;
  totalStudents?: number;
  responseRate?: number;
  acceptanceRate?: number;
  caasScore?: number;
  totalSpent?: number;
  activeBookings?: number;
  favoriteTutors?: number;
  totalHoursLearned?: number;
  averageRatingGiven?: number;
  reviewsGiven?: number;
}

interface KPIGridProps {
  data: KPIData;
  role: 'tutor' | 'agent' | 'client';
  currency?: string;
}

export default function KPIGrid({ data, role, currency = 'GBP' }: KPIGridProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper to display value or "-" for unavailable data
  const displayValue = (value: number | undefined, defaultValue: string = '-'): string | number => {
    if (value === undefined || value === null) return defaultValue;
    return value;
  };

  // TUTOR/AGENT KPIs
  const tutorKPIs: KPICardProps[] = [
    {
      label: 'Total Earnings',
      value: formatCurrency(data.totalEarnings),
      change: '+12% vs last month', // TODO: Calculate from API
      timeframe: 'This Month',
      icon: Coins,
      variant: 'success'
    },
    {
      label: 'Upcoming Sessions',
      value: data.upcomingSessions,
      sublabel: `${data.upcomingHours} hours`,
      timeframe: 'Next 7 Days',
      icon: Calendar,
      variant: 'info'
    },
    {
      label: 'Completed Sessions',
      value: data.completedSessionsThisMonth,
      change: '+4 vs last month', // TODO: Calculate from API
      timeframe: 'This Month',
      icon: CheckCircle,
      variant: 'neutral'
    },
    {
      label: 'Average Rating',
      value: data.averageRating > 0 ? data.averageRating.toFixed(1) : '-',
      sublabel: data.totalReviews > 0 ? `From ${data.totalReviews} reviews` : 'No reviews yet',
      change: data.last10Rating && data.averageRating > 0 ? `+${(data.averageRating - data.last10Rating).toFixed(1)} vs last 10` : undefined,
      icon: Star,
      variant: 'success'
    },
    {
      label: 'Repeat Students',
      value: data.totalStudents && data.totalStudents > 0 ? `${data.repeatStudentsPercent}%` : '-',
      sublabel: data.totalStudents && data.totalStudents > 0 ? `${data.repeatStudentsCount} of ${data.totalStudents} students` : 'No students yet',
      icon: Users,
      variant: 'success'
    },
    {
      label: 'CaaS Score',
      value: displayValue(data.caasScore, '-'),
      sublabel: data.caasScore && data.caasScore >= 90 ? 'Premium tier' : data.caasScore && data.caasScore > 0 ? 'Standard tier' : 'Not yet calculated',
      icon: Award,
      variant: 'info',
      clickable: true,
      href: '/caas'
    }
  ];

  // CLIENT KPIs
  const clientKPIs: KPICardProps[] = [
    {
      label: 'Active Bookings',
      value: displayValue(data.activeBookings, '0'),
      sublabel: data.upcomingSessions && data.upcomingSessions > 0 ? 'Next session: Tomorrow' : 'No upcoming bookings', // TODO: Calculate actual next session date from API
      icon: Calendar,
      variant: 'info'
    },
    {
      label: 'Total Spent',
      value: formatCurrency(data.totalSpent || 0),
      change: data.completedSessionsThisMonth > 0 ? `+${data.completedSessionsThisMonth} sessions this month` : undefined,
      timeframe: 'All Time',
      icon: Coins,
      variant: 'neutral'
    },
    {
      label: 'Favorite Tutors',
      value: displayValue(data.favoriteTutors, '-'),
      sublabel: data.favoriteTutors !== undefined && data.favoriteTutors > 0 ? `${data.upcomingSessions || 0} sessions booked` : 'Not available yet',
      icon: Heart,
      variant: 'success'
    },
    {
      label: 'Total Hours Learned',
      value: data.totalHoursLearned && data.totalHoursLearned > 0 ? data.totalHoursLearned : '0',
      change: data.upcomingHours > 0 ? `+${data.upcomingHours} upcoming` : undefined,
      timeframe: 'All Time',
      icon: Clock,
      variant: 'info'
    },
    {
      label: 'Average Rating Given',
      value: data.averageRatingGiven && data.averageRatingGiven > 0 ? data.averageRatingGiven.toFixed(1) : '-',
      sublabel: data.reviewsGiven && data.reviewsGiven > 0 ? `From ${data.reviewsGiven} reviews` : 'No reviews given yet',
      icon: Star,
      variant: 'neutral'
    },
    {
      label: 'CaaS Score',
      value: displayValue(data.caasScore, '-'),
      sublabel: data.caasScore && data.caasScore >= 90 ? 'Premium tier' : data.caasScore && data.caasScore > 0 ? 'Standard tier' : 'Not yet calculated',
      icon: Award,
      variant: 'info',
      clickable: true,
      href: '/caas'
    }
  ];

  const kpis = role === 'client' ? clientKPIs : tutorKPIs;

  return (
    <div className={styles.grid}>
      {kpis.map((kpi, index) => (
        <KPICard key={index} {...kpi} />
      ))}
    </div>
  );
}
