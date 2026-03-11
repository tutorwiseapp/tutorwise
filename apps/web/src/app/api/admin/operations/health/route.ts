/**
 * GET /api/admin/operations/health
 * Platform health stats — workflow executions, agent status, exceptions, shadow divergences.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [
      runningExecutions,
      failedExecutions24h,
      pendingTasks,
      shadowExecutions,
      openExceptions,
      criticalExceptions,
      activeAgents,
      recentAgentRuns,
      recentTeamRuns,
    ] = await Promise.all([
      // Running workflow executions
      supabase.from('workflow_executions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'running'),

      // Failed executions in last 24h
      supabase.from('workflow_executions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

      // Pending HITL tasks
      supabase.from('workflow_tasks')
        .select('id, name, execution_id, created_at', { count: 'exact' })
        .eq('status', 'pending')
        .eq('completion_mode', 'hitl')
        .order('created_at', { ascending: true })
        .limit(5),

      // Shadow executions with divergences
      supabase.from('workflow_executions')
        .select('id', { count: 'exact', head: true })
        .eq('is_shadow', true)
        .not('shadow_divergence', 'is', null),

      // Open exceptions
      supabase.from('workflow_exceptions')
        .select('id, title, severity, source, created_at', { count: 'exact' })
        .in('status', ['open', 'claimed'])
        .order('created_at', { ascending: false })
        .limit(5),

      // Critical exceptions
      supabase.from('workflow_exceptions')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .in('status', ['open', 'claimed']),

      // Active specialist agents
      supabase.from('specialist_agents')
        .select('slug, name, status, last_run_at')
        .eq('status', 'active')
        .order('last_run_at', { ascending: false }),

      // Recent agent runs (last 24h)
      supabase.from('agent_run_outputs')
        .select('id, agent_slug, status, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Recent team runs (last 24h)
      supabase.from('agent_team_run_outputs')
        .select('id, team_id, status, created_at, team:agent_teams!team_id(name)')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        workflows: {
          running: runningExecutions.count ?? 0,
          failed24h: failedExecutions24h.count ?? 0,
          shadowDivergences: shadowExecutions.count ?? 0,
        },
        hitl: {
          pendingCount: pendingTasks.count ?? 0,
          pendingTasks: pendingTasks.data ?? [],
        },
        exceptions: {
          openCount: openExceptions.count ?? 0,
          criticalCount: criticalExceptions.count ?? 0,
          recent: openExceptions.data ?? [],
        },
        agents: {
          active: activeAgents.data ?? [],
          recentRuns24h: recentAgentRuns.data ?? [],
        },
        teams: {
          recentRuns24h: recentTeamRuns.data ?? [],
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
