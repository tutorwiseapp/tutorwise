import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/conductor/agent-quality?last_n=20&agent_slug=developer
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const lastN = Math.min(parseInt(searchParams.get('last_n') ?? '20', 10), 50);
  const agentSlug = searchParams.get('agent_slug');

  const supa = await createServiceRoleClient();

  let agentSlugs: string[];
  if (agentSlug) {
    agentSlugs = [agentSlug];
  } else {
    const { data } = await supa.from('specialist_agents').select('slug').eq('status', 'active').order('slug');
    agentSlugs = (data ?? []).map((a) => a.slug);
  }

  const results = await Promise.all(agentSlugs.map(async (slug) => {
    const { data: rows } = await supa
      .from('agent_run_quality')
      .select('quality_score, tool_calls, tool_successes, output_length, duration_ms, created_at')
      .eq('agent_slug', slug)
      .order('created_at', { ascending: false })
      .limit(lastN * 2);

    if (!rows || rows.length === 0) {
      return { agent_slug: slug, run_count: 0, avg_quality_score: null, trend_pct: null, regression: false, tool_success_rate: null, avg_output_length: 0, avg_duration_ms: 0, sparkline: [], flags: [] };
    }

    const recent = rows.slice(0, lastN);
    const prior  = rows.slice(lastN);

    const scoreAvg = (arr: typeof rows) =>
      arr.length === 0 ? null :
      arr.reduce((s, r) => s + Number(r.quality_score ?? 0), 0) / arr.length;

    const recentAvg = scoreAvg(recent);
    const priorAvg  = scoreAvg(prior);
    const trendPct  = priorAvg && recentAvg != null ? ((recentAvg - priorAvg) / priorAvg) * 100 : null;

    const toolCallTotal    = recent.reduce((s, r) => s + (r.tool_calls ?? 0), 0);
    const toolSuccessTotal = recent.reduce((s, r) => s + (r.tool_successes ?? 0), 0);
    const toolSuccessRate  = toolCallTotal > 0 ? toolSuccessTotal / toolCallTotal : null;
    const avgOutputLength  = recent.reduce((s, r) => s + (r.output_length ?? 0), 0) / recent.length;
    const avgDurationMs    = recent.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / recent.length;
    const sparkline        = recent.slice(0, 10).reverse().map((r) => Number(r.quality_score ?? 0));

    const flags: string[] = [];
    if (trendPct != null && trendPct < -15) flags.push('regression');
    if (toolSuccessRate != null && toolSuccessRate < 0.6) flags.push('low_tool_success');
    if (avgOutputLength < 150) flags.push('short_output');

    return {
      agent_slug: slug,
      run_count: recent.length,
      avg_quality_score: recentAvg != null ? Number(recentAvg.toFixed(4)) : null,
      prior_avg_quality_score: priorAvg != null ? Number(priorAvg.toFixed(4)) : null,
      trend_pct: trendPct != null ? Number(trendPct.toFixed(1)) : null,
      regression: trendPct != null && trendPct < -15,
      tool_success_rate: toolSuccessRate != null ? Number(toolSuccessRate.toFixed(3)) : null,
      avg_output_length: Math.round(avgOutputLength),
      avg_duration_ms: Math.round(avgDurationMs),
      sparkline,
      flags,
    };
  }));

  return NextResponse.json({ success: true, data: results, last_n: lastN });
}
