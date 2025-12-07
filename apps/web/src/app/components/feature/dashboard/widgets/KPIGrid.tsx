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
      value: data.averageRating.toFixed(1),
      sublabel: `From ${data.totalReviews} reviews`,
      change: data.last10Rating ? `+${(data.averageRating - data.last10Rating).toFixed(1)} vs last 10` : undefined,
      icon: Star,
      variant: 'success'
    },
    {
      label: 'Repeat Students',
      value: `${data.repeatStudentsPercent || 0}%`,
      sublabel: `${data.repeatStudentsCount || 0} of ${data.totalStudents || 0} students`,
      change: '+5% vs last month', // TODO: Calculate from API
      icon: Users,
      variant: 'success'
    },
    {
      label: 'CaaS Score',
      value: data.caasScore || 0,
      sublabel: data.caasScore && data.caasScore >= 90 ? 'Premium tier' : 'Standard tier',
      change: '+3 this week', // TODO: Calculate from API
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
      value: data.activeBookings || 0,
      sublabel: 'Next session: Tomorrow', // TODO: Calculate from API
      icon: Calendar,
      variant: 'info'
    },
    {
      label: 'Total Spent',
      value: formatCurrency(data.totalSpent || 0),
      change: `+${formatCurrency(data.totalEarnings || 0)} this month`,
      timeframe: 'All Time',
      icon: Coins,
      variant: 'neutral'
    },
    {
      label: 'Favorite Tutors',
      value: data.favoriteTutors || 0,
      sublabel: `${data.upcomingSessions || 0} sessions booked`,
      icon: Heart,
      variant: 'success'
    },
    {
      label: 'Total Hours Learned',
      value: data.totalHoursLearned || 0,
      change: `+${data.upcomingHours || 0} this month`,
      timeframe: 'All Time',
      icon: Clock,
      variant: 'info'
    },
    {
      label: 'Average Rating Given',
      value: data.averageRatingGiven?.toFixed(1) || '0.0',
      sublabel: `From ${data.reviewsGiven || 0} reviews`,
      icon: Star,
      variant: 'neutral'
    },
    {
      label: 'CaaS Score',
      value: data.caasScore || 0,
      sublabel: data.caasScore && data.caasScore >= 90 ? 'Premium tier' : 'Standard tier',
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
