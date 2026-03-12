/**
 * GET /api/admin/workflow/briefing
 * Generates an AI operational briefing from live platform metrics.
 * Response is cached for 1 hour via Next.js revalidation.
 */

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Auth check
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: adminProfile } = await authSupabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createServiceRoleClient();

    // Gather metrics in parallel
    const [executionsResult, exceptionsResult, divergencesResult, webhooksResult, onboardingResult] = await Promise.all([
      supabase
        .from('workflow_executions')
        .select('status', { count: 'exact' })
        .in('status', ['running', 'paused', 'completed', 'failed'])
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('workflow_exceptions')
        .select('severity', { count: 'exact' })
        .in('status', ['open', 'claimed']),
      supabase
        .from('workflow_executions')
        .select('id', { count: 'exact', head: true })
        .eq('is_shadow', true)
        .not('shadow_divergence', 'is', null),
      supabase
        .from('failed_webhooks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabase
        .from('onboarding_platform_metrics_daily')
        .select('tutor_conversion_pct, client_conversion_pct, approval_pending, approval_under_review, mid_onboarding_abandoned, tutor_biggest_dropoff_stage')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const executions = executionsResult.data ?? [];
    const running = executions.filter((e) => e.status === 'running').length;
    const paused = executions.filter((e) => e.status === 'paused').length;
    const completed = executions.filter((e) => e.status === 'completed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const unresolvedExceptions = exceptionsResult.count ?? 0;
    const shadowDivergences = divergencesResult.count ?? 0;
    const failedWebhooks = webhooksResult.count ?? 0;
    const ob = onboardingResult.data;

    const onboardingLine = ob
      ? `\n- Onboarding: tutor conversion ${ob.tutor_conversion_pct ?? '?'}%, client conversion ${ob.client_conversion_pct ?? '?'}%, ${(ob.approval_pending ?? 0) + (ob.approval_under_review ?? 0)} in approval pipeline, ${ob.mid_onboarding_abandoned ?? 0} stalled mid-onboarding${ob.tutor_biggest_dropoff_stage ? `, tutor drop-off at ${ob.tutor_biggest_dropoff_stage}` : ''}`
      : '';

    const userPrompt = `Platform metrics for the last 24 hours:
- Workflow executions: ${running} running, ${paused} paused (awaiting human approval), ${completed} completed, ${failed} failed
- Unresolved exceptions: ${unresolvedExceptions}
- Shadow mode divergences: ${shadowDivergences}
- Failed webhook deliveries (DLQ): ${failedWebhooks}${onboardingLine}

Write a concise 2-3 sentence operational briefing for the admin team. Focus on: overall health, anything requiring immediate attention, and one actionable recommendation. Be direct and factual.`;

    const ai = getAIService();
    const result = await ai.generate({
      systemPrompt: 'You are an operations analyst for Tutorwise, an educational marketplace platform.',
      userPrompt,
      maxTokens: 200,
    });
    const briefing = result.content;

    return NextResponse.json({ success: true, data: { briefing } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
