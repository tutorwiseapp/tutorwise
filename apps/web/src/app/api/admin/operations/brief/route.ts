/**
 * GET /api/admin/operations/brief
 * AI-generated daily operations brief — synthesises intelligence from all domain metrics.
 * Cached per day, regenerate on demand with ?refresh=true.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// In-memory cache (per-instance; fine for single-server / Vercel function)
let cachedBrief: { date: string; brief: string; generatedAt: string } | null = null;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const today = new Date().toISOString().split('T')[0];
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    // Return cached brief if same day and not forcing refresh
    if (cachedBrief && cachedBrief.date === today && !refresh) {
      return NextResponse.json({ success: true, data: cachedBrief, cached: true });
    }

    // Gather intelligence from all domain metrics tables
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const metricDate = yesterday.toISOString().split('T')[0];

    const [
      bookings,
      listings,
      financials,
      retention,
      caas,
      marketplace,
      seo,
      aiAdoption,
    ] = await Promise.all([
      supabase.from('bookings_platform_metrics_daily').select('*').eq('metric_date', metricDate).maybeSingle(),
      supabase.from('listings_platform_metrics_daily').select('*').eq('metric_date', metricDate).maybeSingle(),
      supabase.from('financials_platform_metrics_daily').select('*').eq('metric_date', metricDate).maybeSingle(),
      supabase.from('retention_platform_metrics_daily').select('*').eq('metric_date', metricDate).maybeSingle(),
      supabase.from('caas_platform_metrics_daily').select('*').eq('snapshot_date', metricDate).maybeSingle(),
      supabase.from('marketplace_platform_metrics_daily').select('*').eq('metric_date', metricDate).maybeSingle(),
      supabase.from('seo_platform_metrics_daily').select('*').eq('metric_date', metricDate).maybeSingle(),
      supabase.from('ai_adoption_platform_metrics_daily').select('*').eq('metric_date', metricDate).maybeSingle(),
    ]);

    // Gather operational status
    const [activeExecutions, pendingTasks, openExceptions, recentAgentRuns] = await Promise.all([
      supabase.from('workflow_executions').select('id, status', { count: 'exact', head: true }).eq('status', 'running'),
      supabase.from('workflow_tasks').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('workflow_exceptions').select('id', { count: 'exact', head: true }).in('status', ['open', 'claimed']),
      supabase.from('agent_run_outputs').select('id, agent_slug, status, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    const metricsContext = JSON.stringify({
      date: metricDate,
      bookings: bookings.data,
      listings: listings.data,
      financials: financials.data,
      retention: retention.data,
      caas: caas.data,
      marketplace: marketplace.data,
      seo: seo.data,
      aiAdoption: aiAdoption.data,
      operations: {
        activeWorkflows: activeExecutions.count ?? 0,
        pendingHITLTasks: pendingTasks.count ?? 0,
        openExceptions: openExceptions.count ?? 0,
        recentAgentRuns: recentAgentRuns.data?.length ?? 0,
      },
    }, null, 2);

    const ai = getAIService();
    const result = await ai.generate({
      systemPrompt: 'You are the Tutorwise Operations Intelligence Agent. Generate a concise daily operations brief for the admin team.',
      userPrompt: `PLATFORM METRICS (${metricDate}):
${metricsContext}

INSTRUCTIONS:
- Lead with the most important insight or action item
- Highlight anomalies, risks, or opportunities across domains
- Use bullet points, keep it scannable
- Include specific numbers where relevant
- If metrics are null/missing for a domain, note it briefly
- End with 1-2 recommended actions for today
- Keep the entire brief under 400 words
- Do not use markdown headers, just bullet points and short paragraphs`,
      temperature: 0.3,
    });

    cachedBrief = {
      date: today,
      brief: result.content,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: cachedBrief, cached: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
