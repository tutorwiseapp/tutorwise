/**
 * Filename: src/hooks/useUserMetric.ts
 * Purpose: React hook for fetching user dashboard metrics with historical comparison
 * Created: 2026-01-22
 * Phase: Dashboard Alignment Phase 1.1
 *
 * This hook queries the user_statistics_daily table to retrieve per-user metrics
 * with comparison to previous periods (day, week, month).
 *
 * Pattern: Follows useAdminMetric pattern for consistency across dashboards
 *
 * Example usage:
 * ```tsx
 * const { value, previousValue, change, trend, isLoading } = useUserMetric({
 *   userId: profile.id,
 *   metric: 'total_earnings',
 *   compareWith: 'last_month'
 * });
 * ```
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export type UserMetricName =
  // Earnings metrics
  | 'total_earnings'           // Total lifetime earnings (tutors)
  | 'monthly_earnings'         // Current month earnings
  | 'pending_earnings'         // Earnings not yet paid out
  | 'total_spending'           // Total lifetime spending (clients)
  | 'monthly_spending'         // Current month spending

  // Booking metrics
  | 'total_sessions'           // Total completed sessions
  | 'monthly_sessions'         // Current month completed sessions
  | 'upcoming_sessions'        // Sessions in next 7 days
  | 'cancelled_sessions'       // Total cancelled sessions
  | 'hours_taught'             // Total hours taught (tutors)
  | 'hours_learned'            // Total hours learned (clients)

  // Student/Client metrics
  | 'total_students'           // Total unique students taught
  | 'active_students'          // Students with session in last 30 days
  | 'new_students'             // Students who started this month
  | 'returning_students'       // Students with >1 session

  // Rating metrics
  | 'average_rating'           // Average rating received
  | 'total_reviews'            // Total reviews received
  | 'five_star_reviews'        // Number of 5-star reviews

  // Listing metrics
  | 'active_listings'          // Published listings
  | 'total_listings'           // All listings (any status)
  | 'listing_views'            // Total listing views
  | 'listing_bookings'         // Bookings from listings

  // Message metrics
  | 'unread_messages'          // Unread message count
  | 'total_conversations'      // Total conversation threads

  // Referral metrics
  | 'referrals_made'           // Total referrals created
  | 'referrals_converted'      // Referrals that signed up
  | 'referral_earnings'        // Commission earned from referrals

  // CaaS metrics
  | 'caas_score'               // Current CaaS credibility score
  | 'profile_completeness'     // Profile completion percentage;

export type ComparisonPeriod = 'yesterday' | 'last_week' | 'last_month';

export interface UseUserMetricOptions {
  userId: string;
  metric: UserMetricName;
  compareWith?: ComparisonPeriod;
}

export interface UserMetricResult {
  value: number;
  previousValue: number | null;
  change: number | null;
  changePercent: number | null;
  trend: 'up' | 'down' | 'neutral';
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook to fetch user metrics with historical comparison
 *
 * Follows the same pattern as useAdminMetric for consistency:
 * 1. Queries user_statistics_daily table (to be created in Phase 1.2)
 * 2. Returns current value + previous value for comparison
 * 3. Calculates change, changePercent, and trend automatically
 * 4. Uses React Query for caching and background updates
 */
export function useUserMetric({
  userId,
  metric,
  compareWith = 'last_month',
}: UseUserMetricOptions): UserMetricResult {
  const supabase = createClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-metric', userId, metric, compareWith],
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

      // Fetch current value (most recent date for this user)
      const { data: currentData, error: currentError } = await supabase
        .from('user_statistics_daily')
        .select(metric)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (currentError) {
        throw new Error(`Failed to fetch current ${metric}: ${currentError.message}`);
      }

      // Fetch previous value for comparison
      const { data: previousData, error: _previousError } = await supabase
        .from('user_statistics_daily')
        .select(metric)
        .eq('user_id', userId)
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
    enabled: !!userId, // Only run query if userId is provided
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes - same as admin metrics
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Calculate change and trend (identical logic to useAdminMetric)
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
 * Helper function to format metric change text
 * (Identical to formatMetricChange in useAdminMetric for consistency)
 */
export function formatUserMetricChange(
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
