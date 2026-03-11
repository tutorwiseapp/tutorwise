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

    // seo_keywords uses current_position (not position), clicks/impressions/ctr (not *_28d/*_pct)
    const [metrics, topKeywords, risingKeywords] = await Promise.all([
      supabase
        .from('seo_platform_metrics_daily')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('seo_keywords')
        .select('keyword, current_position, search_volume, clicks, impressions, ctr')
        .not('current_position', 'is', null)
        .order('current_position', { ascending: true })
        .limit(15),
      supabase
        .from('seo_keywords')
        .select('keyword, current_position, search_volume, clicks')
        .gte('current_position', 6)
        .lte('current_position', 20)
        .not('search_volume', 'is', null)
        .order('search_volume', { ascending: false })
        .limit(10),
    ]);

    if (metrics.error) throw new Error(metrics.error.message);
    // Map raw DB columns (snapshot_date, keywords_top5, etc.) to display-friendly names
    const raw = metrics.data as Record<string, unknown> | null;
    const latest = raw ? {
      snapshot_date: raw.snapshot_date,
      total_keywords:
        ((raw.keywords_top5 as number) ?? 0) +
        ((raw.keywords_top10 as number) ?? 0) +
        ((raw.keywords_page2 as number) ?? 0) +
        ((raw.keywords_page3plus as number) ?? 0) +
        ((raw.not_ranked as number) ?? 0),
      top3_count: raw.keywords_top5 ?? 0,    // best available proxy (top 5)
      page1_count: raw.keywords_top10 ?? 0,
      avg_position: raw.avg_position,
      avg_position_delta: raw.avg_position_delta,
      total_backlinks: raw.active_backlinks,
    } : null;
    return {
      latest,
      topKeywords: (topKeywords.data ?? []).map((k: Record<string, unknown>) => ({
        keyword: k.keyword,
        position: k.current_position,
        search_volume: k.search_volume,
        clicks_28d: k.clicks,
        impressions_28d: k.impressions,
        ctr_pct: k.ctr,
      })),
      page1Opportunities: (risingKeywords.data ?? []).map((k: Record<string, unknown>) => ({
        keyword: k.keyword,
        position: k.current_position,
        search_volume: k.search_volume,
        clicks_28d: k.clicks,
      })),
    };
  },

  async query_keyword_opportunities(input) {
    const supabase = await createServiceRoleClient();
    const minPosition = (input.min_position as number) ?? 6;
    const maxPosition = (input.max_position as number) ?? 20;
    const limit = (input.limit as number) ?? 25;

    // seo_keywords uses current_position (not position), clicks/impressions/ctr (not *_28d/*_pct), url (not hub_id)
    const { data, error } = await supabase
      .from('seo_keywords')
      .select('keyword, current_position, search_volume, clicks, impressions, ctr, url')
      .gte('current_position', minPosition)
      .lte('current_position', maxPosition)
      .order('search_volume', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return {
      positionRange: { min: minPosition, max: maxPosition },
      keywords: (data ?? []).map((k: Record<string, unknown>) => ({
        keyword: k.keyword,
        position: k.current_position,
        search_volume: k.search_volume,
        clicks_28d: k.clicks,
        impressions_28d: k.impressions,
        ctr_pct: k.ctr,
        url: k.url,
      })),
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

    // listings.completeness_score does not exist as a DB column — completeness is
    // computed by the pg_cron function and stored in listings_platform_metrics_daily.
    // incompleteListings is derived from avg_completeness_score once the metrics run.
    const { data: metricsData, error: metricsError } = await supabase
      .from('listings_platform_metrics_daily')
      .select('*')
      .order('metric_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (metricsError) throw new Error(metricsError.message);
    return {
      latest: metricsData,
      // Not queryable until pg_cron first run — show 0 until then
      incompleteListings: 0,
      completenessThreshold: threshold,
    };
  },

  async query_pricing_intelligence(input) {
    const supabase = await createServiceRoleClient();
    const subject = input.subject as string | undefined;

    let query = supabase
      .from('listings')
      .select('subjects, levels, hourly_rate')
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
      const firstLevel = ((row.levels as string[] | null) ?? [])[0] ?? 'all';
      for (const subj of (row.subjects as string[] | null) ?? []) {
        const key = `${subj}:${firstLevel}`;
        buckets[key] = buckets[key] ?? { rates: [], subject: subj, level: firstLevel };
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

  // ── Phase 3: Use Cases 3–6 Intelligence Tools ──────────────────────────────

  async query_retention_health(input) {
    const supabase = await createServiceRoleClient();
    const days = (input.days as number) ?? 30;

    const [latest, churnSignals, onboardingStall, ltvData, scoreDrops] = await Promise.all([
      supabase
        .from('retention_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('growth_scores')
        .select('user_id, role, score, previous_score, computed_at')
        .not('previous_score', 'is', null)
        .gte('computed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase
        .from('profiles')
        .select('id, active_role, created_at')
        .in('active_role', ['tutor', 'client'])
        .eq('status', 'active')
        .lt('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
        .limit(500),
      supabase
        .from('profiles')
        .select('id, active_role, referred_by_profile_id')
        .eq('active_role', 'client')
        .limit(1000),
      supabase
        .from('growth_scores')
        .select('user_id, role, score, previous_score')
        .filter('previous_score', 'not.is', null),
    ]);

    if (latest.error) throw new Error(latest.error.message);

    const m = latest.data;
    const scoreDropCount = (churnSignals.data ?? []).filter(
      (s) => (s.score ?? 0) - (s.previous_score ?? s.score ?? 0) <= -5,
    ).length;
    const highValueAtRisk = (churnSignals.data ?? []).filter(
      (s) => (s.score ?? 0) - (s.previous_score ?? s.score ?? 0) <= -10 && (s.score ?? 0) >= 60,
    ).length;

    const alerts = [];
    if (m) {
      if ((m.tutor_re_engagement ?? 0) > 20) alerts.push({ type: 'churn_spike', severity: 'warning', role: 'tutor', message: `${m.tutor_re_engagement} tutors in re-engagement cohort`, action: 'Review tutor retention funnel' });
      if ((m.client_re_engagement ?? 0) > 30) alerts.push({ type: 'churn_spike', severity: 'warning', role: 'client', message: `${m.client_re_engagement} clients in re-engagement cohort`, action: 'Trigger client re-engagement sequence' });
      if ((m.stuck_tutors_14d ?? 0) > 20) alerts.push({ type: 'onboarding_stall', severity: 'warning', role: 'tutor', message: `${m.stuck_tutors_14d} tutors stuck in onboarding >14d`, action: 'Review onboarding UX and trigger nudge sequence' });
      if ((m.stuck_clients_14d ?? 0) > 30) alerts.push({ type: 'onboarding_stall', severity: 'warning', role: 'client', message: `${m.stuck_clients_14d} clients stuck in onboarding >14d`, action: 'Review signup → first booking funnel' });
      if (m.activation_rate_30d_pct != null && Number(m.activation_rate_30d_pct) < 40) alerts.push({ type: 'activation_low', severity: 'warning', message: `Activation rate ${m.activation_rate_30d_pct}% below 40% target`, action: 'Review signup → first booking conversion funnel' });
      if (highValueAtRisk > 0) alerts.push({ type: 'high_value_churn_risk', severity: 'critical', message: `${highValueAtRisk} high-value users with score drop > 10pts`, action: 'Immediate Growth Advisor proactive outreach' });
    }

    return {
      cohorts: {
        tutor:  { onboarding: m?.tutor_onboarding ?? 0, activated: m?.tutor_activated ?? 0, retained: m?.tutor_retained ?? 0, re_engagement: m?.tutor_re_engagement ?? 0, win_back: m?.tutor_win_back ?? 0 },
        client: { onboarding: m?.client_onboarding ?? 0, activated: m?.client_activated ?? 0, retained: m?.client_retained ?? 0, re_engagement: m?.client_re_engagement ?? 0, win_back: m?.client_win_back ?? 0 },
        agent:  { onboarding: m?.agent_onboarding ?? 0, activated: m?.agent_activated ?? 0, retained: m?.agent_retained ?? 0, re_engagement: m?.agent_re_engagement ?? 0, win_back: m?.agent_win_back ?? 0 },
        organisation: { onboarding: m?.org_onboarding ?? 0, activated: m?.org_activated ?? 0, retained: m?.org_retained ?? 0, re_engagement: m?.org_re_engagement ?? 0, win_back: m?.org_win_back ?? 0 },
      },
      churn_signals: {
        score_drop_alerts_7d: m?.score_drop_alerts_7d ?? scoreDropCount,
        high_value_at_risk: m?.high_value_at_risk ?? highValueAtRisk,
      },
      onboarding: {
        stuck_tutors_14d: m?.stuck_tutors_14d ?? 0,
        stuck_clients_14d: m?.stuck_clients_14d ?? 0,
        activation_rate_30d: m?.activation_rate_30d_pct ?? null,
      },
      ltv: {
        avg_bookings_per_client_lifetime: m?.avg_client_lifetime_bookings ?? null,
        referral_vs_organic_ltv_ratio: m?.referral_vs_organic_ltv_ratio ?? null,
      },
      alerts,
      metric_date: m?.metric_date ?? null,
      days,
    };
  },

  async query_ai_adoption_health(input) {
    const supabase = await createServiceRoleClient();
    const days = (input.days as number) ?? 30;

    // Note: booking_type enum has values direct/referred/agent_job — no 'ai_agent' value yet.
    // AI booking counts come from the daily metrics table (compute function uses tutor_id proxy).
    const [latest, activeAgents] = await Promise.all([
      supabase
        .from('ai_adoption_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('ai_agents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
    ]);

    if (latest.error) throw new Error(latest.error.message);
    const m = latest.data;

    const alerts = [];
    if (m) {
      if ((m.ai_agents_zero_bookings ?? 0) > (m.active_ai_agents ?? 1) * 0.5) {
        alerts.push({ type: 'ai_marketplace_cold', severity: 'warning', message: `${m.ai_agents_zero_bookings} active AI agents had 0 bookings in 30d`, action: 'Investigate AI agent listing quality; trigger AI Studio coaching' });
      }
    }

    return {
      sage_pro: {
        active_subscribers: m?.sage_active_subscribers ?? 0,
        new_subscriptions_30d: m?.sage_new_30d ?? 0,
        cancellations_30d: m?.sage_cancellations_30d ?? 0,
        churn_rate: m?.sage_churn_rate_pct ?? null,
        mrr_pence: m?.sage_mrr_pence ?? 0,
        trial_to_paid_rate: m?.sage_trial_to_paid_rate_pct ?? null,
      },
      growth_agent: {
        active_subscribers: m?.growth_active_subscribers ?? 0,
        new_subscriptions_30d: m?.growth_new_30d ?? 0,
        cancellations_30d: m?.growth_cancellations_30d ?? 0,
        churn_rate: m?.growth_churn_rate_pct ?? null,
        mrr_pence: m?.growth_mrr_pence ?? 0,
        sessions_30d: m?.growth_sessions_30d ?? 0,
        power_users_30d: m?.growth_power_users_30d ?? 0,
        free_audit_to_paid_rate: m?.growth_free_to_paid_rate_pct ?? null,
      },
      ai_marketplace: {
        active_ai_agents: m?.active_ai_agents ?? (activeAgents.count ?? 0),
        ai_bookings_30d: m?.ai_bookings_30d ?? 0,
        ai_gmv_30d_pence: m?.ai_gmv_30d_pence ?? 0,
        ai_booking_share: m?.ai_booking_share_pct ?? null,
        ai_agents_with_0_bookings_30d: m?.ai_agents_zero_bookings ?? 0,
      },
      combined: {
        total_ai_mrr_pence: m?.total_ai_mrr_pence ?? 0,
        ai_revenue_share: m?.ai_revenue_share_pct ?? null,
      },
      alerts,
      metric_date: m?.metric_date ?? null,
      days,
    };
  },

  async query_org_conversion_health(input) {
    const supabase = await createServiceRoleClient();
    const days = (input.days as number) ?? 30;

    const [latest, newOrgs, totalOrgs] = await Promise.all([
      supabase
        .from('org_conversion_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('connection_groups')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'organisation')
        .gte('created_at', new Date(Date.now() - days * 86400000).toISOString()),
      supabase
        .from('connection_groups')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'organisation'),
    ]);

    if (latest.error) throw new Error(latest.error.message);
    const m = latest.data;

    const alerts = [];
    if (m) {
      if ((m.tier_3_ready ?? 0) > 0) alerts.push({ type: 'tier3_candidate_inactive', severity: 'warning', message: `${m.tier_3_ready} Tier 3 org candidates — ready to convert, no response in 7d`, action: 'HITL: review high-value org candidates for personal outreach' });
      if ((m.new_org_onboarding_stall ?? 0) > 2) alerts.push({ type: 'new_org_onboarding_stall', severity: 'warning', message: `${m.new_org_onboarding_stall} new orgs with no delegation setup`, action: 'Trigger Organisation Onboarding workflow + review setup UX' });
      if ((m.orgs_below_threshold ?? 0) > 0) alerts.push({ type: 'org_dormancy', severity: 'critical', message: `${m.orgs_below_threshold} organisations with Growth Score < 40`, action: 'Trigger Org Dormancy Re-engagement workflow' });
      if (m.conversion_rate_pct != null && Number(m.conversion_rate_pct) < 5) alerts.push({ type: 'conversion_rate_low', severity: 'info', message: `Org conversion rate ${m.conversion_rate_pct}% — below 5% target`, action: 'Review nudge messaging and org creation UX' });
    }

    return {
      candidate_pipeline: {
        tier_1_candidates: m?.tier_1_candidates ?? 0,
        tier_2_candidates: m?.tier_2_candidates ?? 0,
        tier_3_ready: m?.tier_3_ready ?? 0,
        total_candidates: (m?.tier_1_candidates ?? 0) + (m?.tier_2_candidates ?? 0),
        candidates_nudged_30d: m?.candidates_nudged_30d ?? 0,
        conversion_rate_30d: m?.conversion_rate_pct ?? null,
        avg_days_nudge_to_creation: m?.avg_days_nudge_to_conversion ?? null,
      },
      new_orgs: {
        orgs_created_30d: m?.orgs_created_30d ?? (newOrgs.count ?? 0),
        orgs_from_conductor_nudge: m?.orgs_from_conductor_nudge ?? 0,
        organic_org_creation: (m?.orgs_created_30d ?? 0) - (m?.orgs_from_conductor_nudge ?? 0),
      },
      org_health: {
        total_active_orgs: m?.total_active_orgs ?? (totalOrgs.count ?? 0),
        new_org_onboarding_stall: m?.new_org_onboarding_stall ?? 0,
        avg_members_per_org: m?.avg_members_per_org ?? null,
        avg_org_growth_score: m?.avg_org_growth_score ?? null,
        orgs_below_threshold: m?.orgs_below_threshold ?? 0,
      },
      alerts,
      metric_date: m?.metric_date ?? null,
      days,
    };
  },

  async query_ai_studio_health(input) {
    const supabase = await createServiceRoleClient();
    const days = (input.days as number) ?? 30;

    const [latest, draftStall, coldStart, topAgents] = await Promise.all([
      supabase
        .from('ai_studio_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('ai_agents')
        .select('id, name, created_at')
        .eq('status', 'draft')
        .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .limit(20),
      supabase
        .from('ai_agents')
        .select('id, name, published_at')
        .eq('status', 'active')
        .lt('published_at', new Date(Date.now() - 14 * 86400000).toISOString())
        .limit(20),
      supabase
        .from('ai_agents')
        .select('id, name, total_sessions, avg_rating, total_revenue')
        .eq('status', 'active')
        .order('total_sessions', { ascending: false })
        .limit(10),
    ]);

    if (latest.error) throw new Error(latest.error.message);
    const m = latest.data;

    const alerts = [];
    if (m) {
      if ((m.stuck_in_draft ?? 0) > 10) alerts.push({ type: 'draft_stall', severity: 'warning', message: `${m.stuck_in_draft} AI agents stuck in draft > 7d`, action: 'Trigger configuration coaching sequence for affected tutors' });
      if (m.publish_rate_pct != null && Number(m.publish_rate_pct) < 50) alerts.push({ type: 'publish_rate_low', severity: 'warning', message: `Publish rate ${m.publish_rate_pct}% — fewer than half of created agents go live`, action: 'Review AI Studio configuration UX; simplify setup flow' });
      if ((m.agents_below_quality_threshold ?? 0) > 0) alerts.push({ type: 'quality_concern', severity: 'critical', message: `${m.agents_below_quality_threshold} AI agents with avg rating < 4.0 and ≥3 reviews`, action: 'HITL: review flagged AI agents; consider suspension' });
    }

    return {
      funnel: {
        created_30d: m?.agents_created_30d ?? 0,
        published_30d: m?.agents_published_30d ?? 0,
        publish_rate: m?.publish_rate_pct ?? null,
        first_booking_rate: m?.first_booking_rate_pct ?? null,
        avg_days_create_to_publish: m?.avg_days_create_to_publish ?? null,
        avg_days_publish_to_first_booking: m?.avg_days_publish_to_booking ?? null,
      },
      creator_cohorts: {
        stuck_in_draft: m?.stuck_in_draft ?? (draftStall.data ?? []).length,
        published_zero_bookings_14d: m?.published_zero_bookings ?? (coldStart.data ?? []).length,
        active_earning: m?.active_earning ?? 0,
        scaling: m?.scaling ?? 0,
      },
      quality: {
        avg_rating_all_ai_agents: m?.avg_rating_all_agents ?? null,
        agents_below_threshold: m?.agents_below_quality_threshold ?? 0,
        agents_with_no_reviews: m?.agents_with_no_reviews ?? 0,
        top_agents_by_bookings: (topAgents.data ?? []).map((a: any) => ({
          agent_id: a.id,
          agent_name: a.name,
          bookings_30d: a.total_sessions ?? 0,
          avg_rating: a.avg_rating ?? null,
          revenue_30d_pence: a.total_revenue ?? 0,
        })),
      },
      revenue: {
        total_ai_gmv_30d_pence: m?.total_ai_gmv_30d_pence ?? 0,
        avg_revenue_per_active_agent_pence: m?.avg_revenue_per_active_agent_pence ?? 0,
        top_10_pct_revenue_share: m?.top_10_pct_revenue_share_pct ?? null,
      },
      alerts,
      metric_date: m?.metric_date ?? null,
      days,
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

  // ── Phase 4C-ii: Network Intelligence ────────────────────────────────────────

  async query_network_intelligence(_input) {
    const supabase = await createServiceRoleClient();

    const [networkStatsRes, trendRes, topReferrersRes] = await Promise.all([
      supabase
        .from('referral_network_stats')
        .select('avg_depth, max_depth, hub_count, ghost_rate_pct, delegation_adoption_pct, refreshed_at')
        .maybeSingle(),

      supabase
        .from('referral_metrics_daily')
        .select('snapshot_date, new_referrals, converted_referrals, k_coefficient')
        .order('snapshot_date', { ascending: false })
        .limit(14),

      // NOTE: referrals.agent_id is the referrer (renamed from referrer_id in migration 052)
      supabase
        .from('referrals')
        .select('agent_id, commission_amount_pence')
        .eq('status', 'converted'),
    ]);

    // Aggregate top referrers
    const referrerMap: Record<string, number> = {};
    for (const r of (topReferrersRes.data ?? []) as any[]) {
      if (r.agent_id) {
        referrerMap[r.agent_id] = (referrerMap[r.agent_id] ?? 0) + (r.commission_amount_pence ?? 0);
      }
    }
    const topReferrerIds = Object.entries(referrerMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, commission]) => ({ profile_id: id, lifetime_commission_pence: commission }));

    return {
      network_health: networkStatsRes.data,
      trend_14d: trendRes.data ?? [],
      top_referrers_by_ltv: topReferrerIds,
    };
  },

  // ── Phase 4D: Autonomy Calibration ───────────────────────────────────────────

  async query_process_patterns(input) {
    const supabase = await createServiceRoleClient();
    const { process_id, pattern_type } = input as { process_id?: string; pattern_type?: string };
    let q = supabase
      .from('process_patterns')
      .select('*, workflow_processes(name, execution_mode)')
      .order('confidence', { ascending: false })
      .limit(10);
    if (process_id) q = q.eq('process_id', process_id);
    if (pattern_type) q = q.eq('pattern_type', pattern_type);
    const { data } = await q;
    return { patterns: data ?? [], count: (data ?? []).length };
  },

  async query_autonomy_calibration(_input) {
    const supabase = await createServiceRoleClient();

    const { data: configs } = await supabase
      .from('process_autonomy_config')
      .select('id, process_id, current_tier, accuracy_30d, accuracy_threshold, proposal, workflow_processes(name, slug)')
      .order('updated_at', { ascending: false });

    if (!configs?.length) return { configs: [], proposals: [] };

    // For each config, compute accuracy from decision_outcomes
    const enriched = await Promise.all(
      configs.map(async (config: any) => {
        const { data: execIds } = await supabase
          .from('workflow_executions')
          .select('id')
          .eq('process_id', config.process_id)
          .limit(50);

        const ids = (execIds ?? []).map((e: any) => e.id);
        if (!ids.length) return { ...config, accuracy_computed: null, outcome_count: 0 };

        const { data: outcomes } = await supabase
          .from('decision_outcomes')
          .select('outcome_value')
          .in('execution_id', ids)
          .not('outcome_value', 'is', null)
          .eq('lag_days', 30);

        const measured = outcomes ?? [];
        const correct = measured.filter((o: any) => o.outcome_value > 0.5).length;
        const accuracy = measured.length > 0 ? Math.round((correct / measured.length) * 100) : null;

        // Check if we should propose expansion or downgrade
        let proposal: string | null = config.proposal;
        if (accuracy !== null) {
          if (!proposal && accuracy > config.accuracy_threshold + 10) proposal = 'expand';
          if (!proposal && accuracy < config.accuracy_threshold - 10) proposal = 'downgrade';
        }

        return {
          ...config,
          accuracy_computed: accuracy,
          outcome_count: measured.length,
          suggested_proposal: proposal,
        };
      })
    );

    const pendingProposals = enriched.filter((c: any) => c.suggested_proposal || c.proposal);

    return {
      configs: enriched,
      proposals: pendingProposals,
      summary: `${enriched.length} processes tracked. ${pendingProposals.length} need attention.`,
    };
  },
};

export async function executeTool(
  slug: string,
  input: Record<string, unknown>,
  context?: { profileId?: string; agentSlug?: string; runId?: string }
): Promise<unknown> {
  // MCP tool — namespaced with ':'  (e.g. 'jira:jira_listIssues')
  if (slug.includes(':')) {
    const { getMCPClientManager } = await import('@/lib/mcp/MCPClientManager');
    const [connectionSlug, ...toolParts] = slug.split(':');
    const toolName = toolParts.join(':');
    return getMCPClientManager().callTool(connectionSlug, toolName, input, context);
  }

  // Built-in tool
  const fn = TOOL_EXECUTORS[slug];
  if (!fn) throw new Error(`Unknown tool: ${slug}`);
  return fn(input);
}
