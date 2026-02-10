/**
 * Filename: src/hooks/useAdminMetric.ts
 * Purpose: React hook for fetching admin dashboard metrics with historical comparison
 * Created: 2025-12-24
 *
 * This hook queries the platform_statistics_daily table to retrieve metrics
 * with comparison to previous periods (day, week, month).
 *
 * Example usage:
 * ```tsx
 * const { value, previousValue, change, trend, isLoading } = useAdminMetric({
 *   metric: 'total_users',
 *   compareWith: 'last_month'
 * });
 * ```
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export type MetricName =
  // User metrics
  | 'total_users'
  | 'active_users'
  | 'admin_users'
  | 'pending_onboarding_users'
  // SEO metrics
  | 'seo_total_hubs'
  | 'seo_published_hubs'
  | 'seo_draft_hubs'
  | 'seo_total_spokes'
  | 'seo_published_spokes'
  | 'seo_total_citations'
  | 'seo_active_citations'
  // Bookings metrics
  | 'bookings_total'
  | 'bookings_completed'
  | 'bookings_pending'
  | 'bookings_cancelled'
  | 'bookings_revenue'
  | 'bookings_hours_total'
  // Listings metrics
  | 'listings_total'
  | 'listings_active'
  | 'listings_inactive'
  | 'listings_draft_count'
  | 'listings_published_rate'
  | 'listings_views_total'
  | 'listings_bookings_total'
  | 'listings_active_rate'
  // Reviews metrics
  | 'reviews_total'
  | 'reviews_avg_rating'
  | 'reviews_tutors_reviewed'
  | 'reviews_clients_reviewed'
  | 'reviews_agents_reviewed'
  // Referrals metrics (NEW - requires migration: add-metrics-columns.sql)
  | 'referrals_total'
  | 'referrals_active'
  | 'referrals_converted'
  | 'referrals_conversion_rate'
  | 'referrals_clicks_total'
  | 'referrals_signups_total'
  | 'referrals_commissions_total'
  | 'referrals_avg_commission'
  // Transactions metrics
  | 'transactions_total'
  | 'transactions_clearing'
  | 'transactions_available'
  | 'transactions_paid_out'
  | 'transactions_disputed'
  | 'transactions_refunded'
  | 'platform_revenue'
  // Payouts metrics
  | 'payouts_total'
  | 'payouts_pending'
  | 'payouts_in_transit'
  | 'payouts_completed'
  | 'payouts_failed'
  | 'payouts_total_value'
  // Disputes metrics
  | 'disputes_total'
  | 'disputes_action_required'
  | 'disputes_under_review'
  | 'disputes_won'
  | 'disputes_lost';

export type ComparisonPeriod = 'yesterday' | 'last_week' | 'last_month';

export interface UseAdminMetricOptions {
  metric: MetricName;
  compareWith?: ComparisonPeriod;
}

export interface AdminMetricResult {
  value: number;
  previousValue: number | null;
  change: number | null;
  changePercent: number | null;
  trend: 'up' | 'down' | 'neutral';
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook to fetch admin metrics with historical comparison
 */
export function useAdminMetric({
  metric,
  compareWith = 'last_month',
}: UseAdminMetricOptions): AdminMetricResult {
  const supabase = createClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-metric', metric, compareWith],
    queryFn: async () => {
      // Calculate date ranges based on comparison period
      const today = new Date();
      const _currentDate = today.toISOString().split('T')[0];

      let previousDate: string;
      switch (compareWith) {
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          previousDate = yesterday.toISOString().split('T')[0];
          break;
        }
        case 'last_week': {
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          previousDate = lastWeek.toISOString().split('T')[0];
          break;
        }
        case 'last_month':
        default: {
          const lastMonth = new Date(today);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          previousDate = lastMonth.toISOString().split('T')[0];
          break;
        }
      }

      // Fetch current value (most recent date)
      const { data: currentData, error: currentError } = await supabase
        .from('platform_statistics_daily')
        .select(metric)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (currentError) {
        throw new Error(`Failed to fetch current ${metric}: ${currentError.message}`);
      }

      // Fetch previous value for comparison
      const { data: previousData, error: _previousError } = await supabase
        .from('platform_statistics_daily')
        .select(metric)
        .lte('date', previousDate)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Note: previousError is not thrown - if no historical data exists, we just don't show comparison

      return {
        currentValue: (currentData as any)?.[metric] ?? 0,
        previousValue: (previousData as any)?.[metric] ?? null,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes - statistics don't change frequently
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Calculate change and trend
  const value = data?.currentValue ?? 0;
  const previousValue = data?.previousValue ?? null;

  let change: number | null = null;
  let changePercent: number | null = null;
  let trend: 'up' | 'down' | 'neutral' = 'neutral';

  if (previousValue !== null) {
    change = value - previousValue;
    changePercent = previousValue > 0 ? (change / previousValue) * 100 : null;

    if (change > 0) {
      trend = 'up';
    } else if (change < 0) {
      trend = 'down';
    }
  }

  return {
    value,
    previousValue,
    change,
    changePercent,
    trend,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Helper function to format metric sublabel text
 */
export function formatMetricChange(
  change: number | null,
  changePercent: number | null,
  period: ComparisonPeriod
): string | undefined {
  if (change === null || change === 0) {
    return undefined;
  }

  const periodText = period === 'yesterday' ? 'vs yesterday'
    : period === 'last_week' ? 'vs last week'
    : 'vs last month';

  const sign = change > 0 ? '+' : '';
  return `${sign}${change} ${periodText}`;
}
