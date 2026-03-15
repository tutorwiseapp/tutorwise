/**
 * GET /api/admin/teams/runs
 * Returns all team run outputs across all teams, newest first.
 * Joins agent_teams for team name, pattern, slug.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('agent_team_run_outputs')
      .select(`
        id,
        team_id,
        trigger_type,
        task,
        team_result,
        agent_outputs,
        status,
        duration_ms,
        created_at,
        agent_teams ( name, pattern, slug )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const runs = (data ?? []).map((r) => {
      const teamRaw = r.agent_teams as unknown as { name: string; pattern: string; slug: string } | { name: string; pattern: string; slug: string }[] | null;
      const team = Array.isArray(teamRaw) ? teamRaw[0] ?? null : teamRaw;
      return {
        id: r.id,
        team_id: r.team_id,
        trigger_type: r.trigger_type,
        task: r.task,
        team_result: r.team_result,
        agent_outputs: r.agent_outputs,
        status: r.status,
        duration_ms: r.duration_ms,
        created_at: r.created_at,
        team_name: team?.name ?? 'Unknown',
        team_pattern: team?.pattern ?? '',
        team_slug: team?.slug ?? '',
      };
    });

    return NextResponse.json({ success: true, data: runs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
