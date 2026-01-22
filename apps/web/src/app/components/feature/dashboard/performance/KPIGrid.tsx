/**
 * Filename: KPIGrid.tsx
 * Purpose: Grid container for KPI cards using useUserMetric hook (Phase 1.4)
 * Created: 2025-12-07
 * Updated: 2026-01-22 - Migrated to useUserMetric hook pattern
 *
 * Pattern: Follows admin dashboard useAdminMetric pattern for consistency
 * Key Changes:
 * - Uses useUserMetric hook instead of consolidated API call
 * - Individual metric queries with automatic caching
 * - Historical comparison built into hook (vs yesterday/week/month)
 * - Better performance with parallel fetching
 */

'use client';

import React from 'react';
import { Calendar, CheckCircle, Star, Users, Award, TrendingUp, Coins } from 'lucide-react';
import HubKPICard, { HubKPICardProps } from '@/app/components/hub/charts/HubKPICard';
import { useUserMetric } from '@/hooks/useUserMetric';
import styles from './KPIGrid.module.css';

interface KPIGridProps {
  userId: string;
  role: 'tutor' | 'agent' | 'client';
  currency?: string;
}

export default function KPIGrid({ userId, role, currency = 'GBP' }: KPIGridProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper to format metric change
  const formatMetricChange = (
    value: number,
    previousValue: number | null,
    changePercent: number | null,
    isPercentage?: boolean
  ): string | undefined => {
    if (changePercent === null || previousValue === null) return undefined;
    const sign = changePercent >= 0 ? '+' : '';
    if (isPercentage) {
      return `${sign}${changePercent}% vs last month`;
    }
    return `${sign}${Math.abs(value - previousValue)} vs last month`;
  };

  // ============================================================
  // TUTOR/AGENT METRICS
  // ============================================================

  // Earnings metrics
  const monthlyEarnings = useUserMetric({
    userId,
    metric: 'monthly_earnings',
    compareWith: 'last_month',
  });

  const upcomingSessions = useUserMetric({
    userId,
    metric: 'upcoming_sessions',
    compareWith: 'last_week',
  });

  const monthlySessions = useUserMetric({
    userId,
    metric: 'monthly_sessions',
    compareWith: 'last_month',
  });

  const averageRating = useUserMetric({
    userId,
    metric: 'average_rating',
    compareWith: 'last_month',
  });

  const totalReviews = useUserMetric({
    userId,
    metric: 'total_reviews',
    compareWith: 'last_month',
  });

  const activeStudents = useUserMetric({
    userId,
    metric: 'active_students',
    compareWith: 'last_month',
  });

  const totalStudents = useUserMetric({
    userId,
    metric: 'total_students',
    compareWith: 'last_month',
  });

  const caasScore = useUserMetric({
    userId,
    metric: 'caas_score',
    compareWith: 'last_month',
  });

  // ============================================================
  // CLIENT METRICS
  // ============================================================

  const monthlySpending = useUserMetric({
    userId,
    metric: 'monthly_spending',
    compareWith: 'last_month',
  });

  const totalSpending = useUserMetric({
    userId,
    metric: 'total_spending',
    compareWith: 'last_month',
  });

  // ============================================================
  // TUTOR/AGENT KPI CARDS
  // ============================================================

  const tutorKPIs: HubKPICardProps[] = [
    {
      label: 'Total Earnings',
      value: monthlyEarnings.isLoading ? '-' : formatCurrency(monthlyEarnings.value),
      change: !monthlyEarnings.isLoading
        ? formatMetricChange(
            monthlyEarnings.value,
            monthlyEarnings.previousValue,
            monthlyEarnings.changePercent,
            true
          )
        : undefined,
      timeframe: 'This Month',
      icon: Coins,
      variant: 'success',
      trend: monthlyEarnings.trend,
    },
    {
      label: 'Upcoming Sessions',
      value: upcomingSessions.isLoading ? '-' : upcomingSessions.value,
      sublabel: upcomingSessions.value > 0 ? 'Next 7 days' : 'No upcoming sessions',
      timeframe: 'Next Week',
      icon: Calendar,
      variant: 'info',
      trend: upcomingSessions.trend,
    },
    {
      label: 'Completed Sessions',
      value: monthlySessions.isLoading ? '-' : monthlySessions.value,
      change: !monthlySessions.isLoading
        ? formatMetricChange(
            monthlySessions.value,
            monthlySessions.previousValue,
            monthlySessions.changePercent,
            false
          )
        : undefined,
      timeframe: 'This Month',
      icon: CheckCircle,
      variant: 'neutral',
      trend: monthlySessions.trend,
    },
    {
      label: 'Average Rating',
      value: averageRating.isLoading
        ? '-'
        : averageRating.value > 0
        ? averageRating.value.toFixed(1)
        : '-',
      sublabel: totalReviews.isLoading
        ? 'Loading...'
        : totalReviews.value > 0
        ? `From ${totalReviews.value} reviews`
        : 'No reviews yet',
      icon: Star,
      variant: 'success',
      trend: averageRating.trend,
    },
    {
      label: 'Active Students',
      value: activeStudents.isLoading ? '-' : activeStudents.value,
      sublabel: totalStudents.isLoading
        ? 'Loading...'
        : totalStudents.value > 0
        ? `${totalStudents.value} total students`
        : 'No students yet',
      change: !activeStudents.isLoading
        ? formatMetricChange(
            activeStudents.value,
            activeStudents.previousValue,
            activeStudents.changePercent,
            false
          )
        : undefined,
      icon: Users,
      variant: 'success',
      trend: activeStudents.trend,
    },
    {
      label: 'CaaS Score',
      value: caasScore.isLoading ? '-' : caasScore.value,
      sublabel:
        caasScore.value >= 90
          ? 'Premium tier'
          : caasScore.value > 0
          ? 'Standard tier'
          : 'Not yet calculated',
      change: !caasScore.isLoading
        ? formatMetricChange(
            caasScore.value,
            caasScore.previousValue,
            caasScore.changePercent,
            false
          )
        : undefined,
      icon: Award,
      variant: 'info',
      clickable: true,
      href: '/caas',
      trend: caasScore.trend,
    },
  ];

  // ============================================================
  // CLIENT KPI CARDS
  // ============================================================

  const clientKPIs: HubKPICardProps[] = [
    {
      label: 'Active Bookings',
      value: upcomingSessions.isLoading ? '-' : upcomingSessions.value,
      sublabel:
        upcomingSessions.value > 0 ? 'Next 7 days' : 'No upcoming bookings',
      icon: Calendar,
      variant: 'info',
      trend: upcomingSessions.trend,
    },
    {
      label: 'Total Spent',
      value: monthlySpending.isLoading ? '-' : formatCurrency(monthlySpending.value),
      change: !monthlySpending.isLoading
        ? formatMetricChange(
            monthlySpending.value,
            monthlySpending.previousValue,
            monthlySpending.changePercent,
            true
          )
        : undefined,
      timeframe: 'This Month',
      icon: Coins,
      variant: 'neutral',
      trend: monthlySpending.trend,
    },
    {
      label: 'Completed Sessions',
      value: monthlySessions.isLoading ? '-' : monthlySessions.value,
      change: !monthlySessions.isLoading
        ? formatMetricChange(
            monthlySessions.value,
            monthlySessions.previousValue,
            monthlySessions.changePercent,
            false
          )
        : undefined,
      timeframe: 'This Month',
      icon: CheckCircle,
      variant: 'neutral',
      trend: monthlySessions.trend,
    },
    {
      label: 'Average Rating',
      value: averageRating.isLoading
        ? '-'
        : averageRating.value > 0
        ? averageRating.value.toFixed(1)
        : '-',
      sublabel: totalReviews.isLoading
        ? 'Loading...'
        : totalReviews.value > 0
        ? `${totalReviews.value} reviews given`
        : 'No reviews given yet',
      icon: Star,
      variant: 'success',
      trend: averageRating.trend,
    },
    {
      label: 'Lifetime Spending',
      value: totalSpending.isLoading ? '-' : formatCurrency(totalSpending.value),
      sublabel: 'All time',
      icon: TrendingUp,
      variant: 'info',
      trend: totalSpending.trend,
    },
    {
      label: 'CaaS Score',
      value: caasScore.isLoading ? '-' : caasScore.value,
      sublabel:
        caasScore.value >= 90
          ? 'Premium tier'
          : caasScore.value > 0
          ? 'Standard tier'
          : 'Not yet calculated',
      change: !caasScore.isLoading
        ? formatMetricChange(
            caasScore.value,
            caasScore.previousValue,
            caasScore.changePercent,
            false
          )
        : undefined,
      icon: Award,
      variant: 'info',
      clickable: true,
      href: '/caas',
      trend: caasScore.trend,
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  const kpis = role === 'client' ? clientKPIs : tutorKPIs;

  return (
    <div className={styles.grid}>
      {kpis.map((kpi, index) => (
        <HubKPICard key={index} {...kpi} />
      ))}
    </div>
  );
}
