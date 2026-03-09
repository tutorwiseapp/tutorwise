/**
 * Agent Tool Executor
 * Implements the 10 built-in analyst tools for the specialist agent system.
 * Each tool maps to an analyst_tools slug in the database.
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
};

export async function executeTool(slug: string, input: Record<string, unknown>): Promise<unknown> {
  const fn = TOOL_EXECUTORS[slug];
  if (!fn) throw new Error(`Unknown tool: ${slug}`);
  return fn(input);
}
