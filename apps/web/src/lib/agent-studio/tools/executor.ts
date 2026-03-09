/**
 * Agent Tool Executor
 * Implements the 24 built-in analyst tools for the specialist agent system.
 * Each tool maps to an analyst_tools slug in the database.
 * Phase 3 adds 14 intelligence tools (query_caas_health through query_referral_funnel).
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

type ToolFn = (input: Record<string, unknown>) => Promise<unknown>;

const TOOL_EXECUTORS: Record<string, ToolFn> = {
  async query_booking_trends(input) {
    const supabase = await createServiceRoleClient();
    const days = (input.days as number) ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data, error } = await supabase
      .from('bookings')
      .select('created_at, subjects, status')
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    // Group by week + primary subject
    const weeks: Record<string, Record<string, number>> = {};
    for (const row of data ?? []) {
      const week = new Date(row.created_at).toISOString().slice(0, 10);
      const subject = (row.subjects as string[] | null)?.[0] || 'unknown';
      weeks[week] = weeks[week] ?? {};
      weeks[week][subject] = (weeks[week][subject] ?? 0) + 1;
    }

    return { days, since, weeks, total: (data ?? []).length };
  },

  async query_tutor_performance(input) {
    const supabase = await createServiceRoleClient();
    const limit = (input.limit as number) ?? 20;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, caas_score, average_rating')
      .eq('role', 'tutor')
      .eq('status', 'active')
      .order('caas_score', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return { tutors: data ?? [], count: (data ?? []).length };
  },

  async query_platform_health(_input) {
    const supabase = await createServiceRoleClient();

    const [webhooks, divergences, running] = await Promise.all([
      supabase
        .from('failed_webhooks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabase
        .from('workflow_executions')
        .select('id', { count: 'exact', head: true })
        .eq('is_shadow', true)
        .not('shadow_divergence', 'is', null),
      supabase
        .from('workflow_executions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['running', 'paused']),
    ]);

    return {
      failedWebhooks: webhooks.count ?? 0,
      shadowDivergences: divergences.count ?? 0,
      runningExecutions: running.count ?? 0,
    };
  },

  async query_commissions(input) {
    const supabase = await createServiceRoleClient();
    const days = (input.days as number) ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data, error } = await supabase
      .from('commissions')
      .select('amount, platform_fee, tutor_amount, referrer_amount, type, created_at')
      .gte('created_at', since);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const total = rows.reduce((s, r) => s + (r.amount as number ?? 0), 0);
    const platformTotal = rows.reduce((s, r) => s + (r.platform_fee as number ?? 0), 0);
    const tutorTotal = rows.reduce((s, r) => s + (r.tutor_amount as number ?? 0), 0);
    const referrerTotal = rows.reduce((s, r) => s + (r.referrer_amount as number ?? 0), 0);

    return { days, total, platformTotal, tutorTotal, referrerTotal, count: rows.length };
  },

  async query_growth_scores(input) {
    const supabase = await createServiceRoleClient();
    const limit = (input.limit as number) ?? 20;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, caas_score')
      .eq('role', 'tutor')
      .order('caas_score', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return { tutors: data ?? [], count: (data ?? []).length };
  },

  async query_referral_pipeline(input) {
    const supabase = await createServiceRoleClient();
    const days = (input.days as number) ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data, error } = await supabase
      .from('referrals')
      .select('id, status, commission_amount, created_at')
      .gte('created_at', since);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const referred = rows.length;
    const converted = rows.filter((r) => r.status === 'converted').length;
    const earned = rows.reduce((s, r) => s + (r.commission_amount as number ?? 0), 0);

    return { days, referred, converted, earned, conversionRate: referred ? converted / referred : 0 };
  },

  async query_at_risk_tutors(input) {
    const supabase = await createServiceRoleClient();
    const threshold = (input.threshold as number) ?? 40;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, caas_score, average_rating')
      .eq('role', 'tutor')
      .lt('caas_score', threshold)
      .order('caas_score', { ascending: true })
      .limit(50);

    if (error) throw new Error(error.message);
    return { threshold, tutors: data ?? [], count: (data ?? []).length };
  },

  async query_stripe_payouts(input) {
    const supabase = await createServiceRoleClient();
    const limit = (input.limit as number) ?? 20;

    const { data, error } = await supabase
      .from('stripe_payouts')
      .select('id, amount, currency, status, failure_message, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return { payouts: data ?? [], count: (data ?? []).length };
  },

  async flag_for_review(input) {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('workflow_exceptions')
      .insert({
        severity: input.severity as string ?? 'medium',
        domain: input.domain as string,
        title: input.title as string,
        ai_recommendation: input.ai_recommendation as string ?? null,
        confidence_score: input.confidence_score as number ?? null,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return { flagged: true, exception_id: data.id };
  },

  async send_notification(input) {
    const supabase = await createServiceRoleClient();

    const { error } = await supabase
      .from('platform_notifications')
      .insert({
        user_id: input.user_id as string,
        title: input.title as string,
        message: input.message as string,
        type: (input.type as string) ?? 'info',
      });

    if (error) throw new Error(error.message);
    return { sent: true };
  },

  // ── Phase 3: Intelligence Tools ────────────────────────────────────────────

  async query_caas_health(_input) {
    const supabase = await createServiceRoleClient();

    const [metrics, bandCounts] = await Promise.all([
      supabase
        .from('caas_platform_metrics_daily')
        .select('*')
        .eq('role_type', 'all')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('caas_platform_metrics_daily')
        .select('role_type, snapshot_date, provisional_count, stale_count, avg_caas_score')
        .neq('role_type', 'all')
        .order('snapshot_date', { ascending: false })
        .limit(10),
    ]);

    if (metrics.error) throw new Error(metrics.error.message);
    return {
      latest: metrics.data,
      byRole: bandCounts.data ?? [],
    };
  },

  async query_resources_health(_input) {
    const supabase = await createServiceRoleClient();

    const [metrics, topArticles, bandSummary] = await Promise.all([
      supabase
        .from('resources_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('article_intelligence_scores')
        .select('article_id, score, band, views_30d, bookings_30d, revenue_30d_pence, traffic_trend')
        .order('measured_at', { ascending: false })
        .order('score', { ascending: false })
        .limit(10),
      supabase
        .from('article_intelligence_scores')
        .select('band')
        .order('measured_at', { ascending: false })
        .limit(200),
    ]);

    if (metrics.error) throw new Error(metrics.error.message);

    const bandCount: Record<string, number> = {};
    for (const row of bandSummary.data ?? []) {
      bandCount[row.band] = (bandCount[row.band] ?? 0) + 1;
    }

    return {
      latest: metrics.data,
      topArticles: topArticles.data ?? [],
      bandBreakdown: bandCount,
    };
  },

  async query_editorial_opportunities(_input) {
    const supabase = await createServiceRoleClient();

    const [opportunities, hubGaps] = await Promise.all([
      supabase
        .from('article_intelligence_scores')
        .select('article_id, score, band, views_30d, bookings_30d, conv_rate_pct, days_stale, traffic_trend')
        .in('band', ['Opportunity', 'Underperformer'])
        .order('measured_at', { ascending: false })
        .order('score', { ascending: false })
        .limit(20),
      supabase
        .from('seo_hubs')
        .select('id, subject, status, spoke_count, avg_spoke_word_count')
        .lt('spoke_count', 3)
        .eq('status', 'published')
        .order('spoke_count', { ascending: true })
        .limit(10),
    ]);

    return {
      opportunityArticles: opportunities.data ?? [],
      hubsNeedingSpokes: hubGaps.data ?? [],
    };
  },

  async query_seo_health(_input) {
    const supabase = await createServiceRoleClient();

    const [metrics, topKeywords, risingKeywords] = await Promise.all([
      supabase
        .from('seo_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('seo_keywords')
        .select('keyword, position, search_volume, clicks_28d, impressions_28d, ctr_pct')
        .not('position', 'is', null)
        .order('position', { ascending: true })
        .limit(15),
      supabase
        .from('seo_keywords')
        .select('keyword, position, search_volume, clicks_28d')
        .gte('position', 6)
        .lte('position', 20)
        .not('search_volume', 'is', null)
        .order('search_volume', { ascending: false })
        .limit(10),
    ]);

    if (metrics.error) throw new Error(metrics.error.message);
    return {
      latest: metrics.data,
      topKeywords: topKeywords.data ?? [],
      page1Opportunities: risingKeywords.data ?? [],
    };
  },

  async query_keyword_opportunities(input) {
    const supabase = await createServiceRoleClient();
    const minPosition = (input.min_position as number) ?? 6;
    const maxPosition = (input.max_position as number) ?? 20;
    const limit = (input.limit as number) ?? 25;

    const { data, error } = await supabase
      .from('seo_keywords')
      .select('keyword, position, search_volume, clicks_28d, impressions_28d, ctr_pct, hub_id')
      .gte('position', minPosition)
      .lte('position', maxPosition)
      .order('search_volume', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return {
      positionRange: { min: minPosition, max: maxPosition },
      keywords: data ?? [],
      count: (data ?? []).length,
    };
  },

  async query_content_attribution(input) {
    const supabase = await createServiceRoleClient();
    const limit = (input.limit as number) ?? 20;

    const [topPerformers, deadWeight, recent] = await Promise.all([
      supabase
        .from('article_intelligence_scores')
        .select('article_id, score, band, conv_score, revenue_score, traffic_score, freshness_score, views_30d, bookings_30d, revenue_30d_pence, conv_rate_pct')
        .eq('band', 'Star')
        .order('measured_at', { ascending: false })
        .order('score', { ascending: false })
        .limit(limit),
      supabase
        .from('article_intelligence_scores')
        .select('article_id, score, band, days_stale, views_30d, bookings_30d, traffic_trend')
        .eq('band', 'Dead Weight')
        .order('measured_at', { ascending: false })
        .order('score', { ascending: true })
        .limit(limit),
      supabase
        .from('article_intelligence_scores')
        .select('band')
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      topPerformers: topPerformers.data ?? [],
      deadWeight: deadWeight.data ?? [],
      latestMeasuredAt: recent.data?.band ? 'today' : null,
    };
  },

  async query_marketplace_health(input) {
    const supabase = await createServiceRoleClient();
    const days = (input.days as number) ?? 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [metrics, zeroResultQueries, recentSearches] = await Promise.all([
      supabase
        .from('marketplace_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('marketplace_search_events')
        .select('subject, level, query, results_count')
        .eq('is_zero_result', true)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('marketplace_search_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
    ]);

    if (metrics.error) throw new Error(metrics.error.message);
    return {
      latest: metrics.data,
      recentSearchCount: recentSearches.count ?? 0,
      zeroResultSamples: zeroResultQueries.data ?? [],
      days,
    };
  },

  async query_supply_demand_gap(input) {
    const supabase = await createServiceRoleClient();
    const days = (input.days as number) ?? 14;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [searches, listings] = await Promise.all([
      supabase
        .from('marketplace_search_events')
        .select('subject, level, is_zero_result')
        .not('subject', 'is', null)
        .gte('created_at', since),
      supabase
        .from('listings')
        .select('subjects, level, status')
        .eq('status', 'active'),
    ]);

    // Aggregate search demand by subject
    const demand: Record<string, { total: number; zeroResult: number }> = {};
    for (const row of searches.data ?? []) {
      const subj = (row.subject as string) || 'unknown';
      demand[subj] = demand[subj] ?? { total: 0, zeroResult: 0 };
      demand[subj].total++;
      if (row.is_zero_result) demand[subj].zeroResult++;
    }

    // Aggregate active supply by subject
    const supply: Record<string, number> = {};
    for (const row of listings.data ?? []) {
      for (const subj of (row.subjects as string[] | null) ?? []) {
        supply[subj] = (supply[subj] ?? 0) + 1;
      }
    }

    const gaps = Object.entries(demand)
      .map(([subject, d]) => ({
        subject,
        searches: d.total,
        zeroResultRate: d.total ? Math.round((d.zeroResult / d.total) * 100) : 0,
        activeListings: supply[subject] ?? 0,
      }))
      .filter((g) => g.zeroResultRate > 20)
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 20);

    return { days, gaps };
  },

  async query_booking_health(_input) {
    const supabase = await createServiceRoleClient();

    const [metrics, liveStalls, recentDisputes] = await Promise.all([
      supabase
        .from('bookings_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(7),
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Confirmed')
        .neq('scheduling_status', 'scheduled')
        .lt('created_at', new Date(Date.now() - 48 * 3600000).toISOString()),
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('payment_status', 'Disputed'),
    ]);

    if (metrics.error) throw new Error(metrics.error.message);
    return {
      trend: metrics.data ?? [],
      liveStalls48h: liveStalls.count ?? 0,
      liveDisputes: recentDisputes.count ?? 0,
    };
  },

  async query_listing_health(input) {
    const supabase = await createServiceRoleClient();
    const threshold = (input.completeness_threshold as number) ?? 70;

    const [metrics, incompleteCount] = await Promise.all([
      supabase
        .from('listings_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('completeness_score', threshold),
    ]);

    if (metrics.error) throw new Error(metrics.error.message);
    return {
      latest: metrics.data,
      incompleteListings: incompleteCount.count ?? 0,
      completenessThreshold: threshold,
    };
  },

  async query_pricing_intelligence(input) {
    const supabase = await createServiceRoleClient();
    const subject = input.subject as string | undefined;

    let query = supabase
      .from('listings')
      .select('subjects, level, hourly_rate')
      .eq('status', 'active')
      .not('hourly_rate', 'is', null);

    if (subject) {
      query = query.contains('subjects', [subject]);
    }

    const { data, error } = await query.limit(500);
    if (error) throw new Error(error.message);

    // Aggregate by subject+level
    const buckets: Record<string, { rates: number[]; subject: string; level: string }> = {};
    for (const row of data ?? []) {
      for (const subj of (row.subjects as string[] | null) ?? []) {
        const key = `${subj}:${row.level ?? 'all'}`;
        buckets[key] = buckets[key] ?? { rates: [], subject: subj, level: row.level ?? 'all' };
        buckets[key].rates.push(row.hourly_rate as number);
      }
    }

    const pricing = Object.values(buckets).map(({ subject: s, level: l, rates }) => ({
      subject: s,
      level: l,
      count: rates.length,
      min: Math.min(...rates),
      max: Math.max(...rates),
      avg: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
      p50: rates.sort((a, b) => a - b)[Math.floor(rates.length / 2)],
    })).sort((a, b) => b.count - a.count).slice(0, 30);

    return { pricing, subject: subject ?? 'all' };
  },

  async query_financial_health(_input) {
    const supabase = await createServiceRoleClient();

    const [metrics, clearingLive, anomalies] = await Promise.all([
      supabase
        .from('financials_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(7),
      supabase
        .from('transactions')
        .select('id, amount, created_at')
        .eq('status', 'clearing')
        .lt('created_at', new Date(Date.now() - 14 * 86400000).toISOString()),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'Tutoring Payout')
        .not('status', 'in', '("reversed","refunded")'),
    ]);

    if (metrics.error) throw new Error(metrics.error.message);
    return {
      trend: metrics.data ?? [],
      stalledClearingItems: (clearingLive.data ?? []).length,
      activePayout: anomalies.count ?? 0,
    };
  },

  async query_virtualspace_health(_input) {
    const supabase = await createServiceRoleClient();

    const [metrics, liveSessions] = await Promise.all([
      supabase
        .from('virtualspace_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(7),
      supabase
        .from('virtualspace_sessions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'scheduled'])
        .gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString()),
    ]);

    if (metrics.error) throw new Error(metrics.error.message);
    return {
      trend: metrics.data ?? [],
      sessionsLast24h: liveSessions.count ?? 0,
    };
  },

  async query_referral_funnel(input) {
    const supabase = await createServiceRoleClient();
    const segment = (input.segment as string) ?? 'platform';

    const [dailyMetrics, networkStats, funnelSummary] = await Promise.all([
      supabase
        .from('referral_metrics_daily')
        .select('*')
        .eq('segment', segment)
        .order('computed_date', { ascending: false })
        .limit(14),
      supabase
        .from('referral_network_stats')
        .select('avg_depth, max_depth, hub_count, ghost_rate_pct, delegation_adoption_pct, multi_hop_users, total_referred_users, refreshed_at')
        .maybeSingle(),
      supabase
        .from('referrals')
        .select('status')
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);

    if (dailyMetrics.error) throw new Error(dailyMetrics.error.message);

    const statuses: Record<string, number> = {};
    for (const row of funnelSummary.data ?? []) {
      statuses[row.status] = (statuses[row.status] ?? 0) + 1;
    }

    return {
      segment,
      trend: dailyMetrics.data ?? [],
      network: networkStats.data,
      funnelLast30d: statuses,
    };
  },
};

export async function executeTool(slug: string, input: Record<string, unknown>): Promise<unknown> {
  const fn = TOOL_EXECUTORS[slug];
  if (!fn) throw new Error(`Unknown tool: ${slug}`);
  return fn(input);
}
