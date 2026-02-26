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
  | 'disputes_lost'
  // Sage metrics
  | 'sage_sessions_total'
  | 'sage_questions_total'
  | 'sage_unique_users'
  | 'sage_avg_questions_per_session'
  | 'sage_free_users'
  | 'sage_pro_users'
  | 'sage_pro_subscriptions'
  | 'sage_mrr'
  | 'sage_free_daily_usage'
  | 'sage_free_limit_hits'
  | 'sage_free_avg_questions'
  | 'sage_pro_monthly_usage'
  | 'sage_pro_mrr'
  | 'sage_pro_avg_questions'
  | 'sage_ai_cost_total'
  | 'sage_cost_per_question'
  | 'sage_total_ai_cost'
  | 'sage_margin_free'
  | 'sage_margin_pro'
  | 'sage_subject_maths'
  | 'sage_subject_english'
  | 'sage_subject_science'
  | 'sage_subject_general'
  // Lexi metrics
  | 'lexi_conversations_total'
  | 'lexi_messages_total'
  | 'lexi_unique_users'
  | 'lexi_avg_messages_per_conversation'
  | 'lexi_feedback_positive'
  | 'lexi_feedback_negative'
  | 'lexi_satisfaction_rate'
  | 'lexi_persona_student'
  | 'lexi_persona_tutor'
  | 'lexi_persona_client'
  | 'lexi_persona_agent'
  | 'lexi_persona_organisation'
  | 'lexi_provider_rules'
  | 'lexi_provider_claude'
  | 'lexi_provider_gemini'
  | 'lexi_daily_usage'
  | 'lexi_limit_hits'
  | 'lexi_total_users'
  | 'lexi_avg_conversations_per_user'
  | 'lexi_daily_quota_used'
  | 'lexi_daily_quota_remaining'
  | 'lexi_quota_reset_rate'
  | 'lexi_ai_cost_total'
  | 'lexi_cost_per_conversation'
  | 'lexi_free_usage_percent'
  | 'lexi_paid_usage_percent'
  | 'lexi_monthly_projection'
  // AI Tutors metrics
  | 'ai_tutors_total'
  | 'ai_tutors_active'
  | 'ai_tutors_platform'
  | 'ai_tutors_user'
  | 'ai_tutors_draft'
  | 'ai_tutors_active_rate'
  | 'ai_tutor_sessions_total'
  // CAS metrics
  | 'cas_agents_active'
  | 'cas_tasks_generated'
  | 'cas_insights_created'
  | 'cas_agent_executions'
  | 'cas_feedback_processed'
  | 'cas_feedback_to_tasks'
  | 'cas_feedback_conversion_rate'
  | 'cas_agent_marketer_executions'
  | 'cas_agent_analyst_executions'
  | 'cas_agent_planner_executions'
  | 'cas_agent_developer_executions'
  | 'cas_agent_tester_executions'
  | 'cas_agent_qa_executions'
  | 'cas_agent_engineer_executions'
  | 'cas_agent_security_executions'
  | 'cas_runtime_custom_usage'
  | 'cas_runtime_langgraph_usage'
  | 'cas_runtime_current'
  | 'cas_avg_execution_time_ms'
  | 'cas_success_rate'
  | 'cas_error_rate'
  | 'cas_uptime_percent'
  | 'cas_vulnerabilities_found'
  | 'cas_vulnerabilities_critical'
  | 'cas_scans_completed'
  | 'cas_ai_cost_total'
  | 'cas_cost_per_task'
  | 'cas_token_usage_total'
  | 'cas_monthly_cost_projection';

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
