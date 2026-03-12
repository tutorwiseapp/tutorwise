/**
 * GET /api/admin/onboarding/intelligence
 *
 * Returns onboarding funnel health: conversion rates by role, approval pipeline,
 * time-to-activation, abandonment signals, and alerts.
 */

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const svc = createServiceRoleClient();

    const [latest, prevDay, midAbandoned, verifiedNoRole] = await Promise.all([
      svc
        .from('onboarding_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      svc
        .from('onboarding_platform_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .range(1, 1)
        .maybeSingle(),
      svc
        .from('onboarding_sessions')
        .select('id', { count: 'exact', head: true })
        .is('completed_at', null)
        .gt('current_step', 0)
        .lt('last_active', new Date(Date.now() - 3 * 86400000).toISOString()),
      svc
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('email_verified', true)
        .is('primary_role', null)
        .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

    const m = latest.data;
    const prev = prevDay.data;

    const buildFunnel = (prefix: string) => {
      if (!m) return null;
      const get = (key: string) => (m as Record<string, unknown>)[`${prefix}_${key}`] as number ?? 0;
      const signups = get('signups_30d');
      const verified = get('verified_30d');
      const role = get('role_selected_30d');
      const profile = get('profile_complete_30d');
      const setup = get('value_setup_30d');
      const activated = get('activated_30d');
      const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 1000) / 10 : 0;
      return {
        signups, verified, role_selected: role,
        profile_complete: profile, value_setup: setup, activated,
        verified_pct: pct(verified, signups),
        role_selected_pct: pct(role, verified),
        profile_complete_pct: pct(profile, role),
        value_setup_pct: pct(setup, profile),
        activated_pct: pct(activated, setup),
        overall_conversion_pct: (m as Record<string, unknown>)[`${prefix}_conversion_pct`] ?? null,
      };
    };

    const alerts: { type: string; severity: string; role?: string; message: string }[] = [];
    if (m) {
      if (m.tutor_conversion_pct != null && Number(m.tutor_conversion_pct) < 25)
        alerts.push({ type: 'activation_low', severity: 'warning', role: 'tutor', message: `Tutor conversion ${m.tutor_conversion_pct}% — below 25%` });
      if (m.client_conversion_pct != null && Number(m.client_conversion_pct) < 25)
        alerts.push({ type: 'activation_low', severity: 'warning', role: 'client', message: `Client conversion ${m.client_conversion_pct}% — below 25%` });
      if ((m.approval_pending ?? 0) + (m.approval_under_review ?? 0) > 20)
        alerts.push({ type: 'approval_bottleneck', severity: 'warning', message: `${(m.approval_pending ?? 0) + (m.approval_under_review ?? 0)} tutors in approval pipeline` });
      if (m.approval_median_hours != null && Number(m.approval_median_hours) > 48)
        alerts.push({ type: 'approval_slow', severity: 'critical', message: `Median approval ${m.approval_median_hours}h — exceeds 48h SLA` });
      if ((m.mid_onboarding_abandoned ?? 0) > 30)
        alerts.push({ type: 'abandonment_spike', severity: 'warning', message: `${m.mid_onboarding_abandoned} users stalled mid-onboarding` });
    }

    return NextResponse.json({
      success: true,
      data: {
        funnel: {
          tutor: buildFunnel('tutor'),
          client: buildFunnel('client'),
          agent: buildFunnel('agent'),
          organisation: buildFunnel('org'),
        },
        approval_pipeline: {
          pending: m?.approval_pending ?? 0,
          under_review: m?.approval_under_review ?? 0,
          approved_30d: m?.approval_approved_30d ?? 0,
          rejected_30d: m?.approval_rejected_30d ?? 0,
          median_hours: m?.approval_median_hours ?? null,
        },
        time_to_activate: {
          tutor_median_days: m?.tutor_time_to_activate_median_days ?? null,
          client_median_days: m?.client_time_to_activate_median_days ?? null,
        },
        abandonment: {
          mid_onboarding: midAbandoned.count ?? (m?.mid_onboarding_abandoned ?? 0),
          post_onboarding_no_setup: m?.post_onboarding_no_setup ?? 0,
          verified_no_role: verifiedNoRole.count ?? (m?.verified_no_role ?? 0),
        },
        biggest_dropoff: {
          tutor: m?.tutor_biggest_dropoff_stage ?? null,
          client: m?.client_biggest_dropoff_stage ?? null,
        },
        alerts,
        metric_date: m?.metric_date ?? null,
        previous_metric_date: prev?.metric_date ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
