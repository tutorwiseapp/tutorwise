/*
 * Filename: src/app/api/admin/conductor/workflows/[id]/shadow/route.ts
 * Purpose: Process Mining — enhanced shadow vs live comparison + go-live checklist
 * Phase: Conductor 5 — Process Mining Enhancement
 * Created: 2026-03-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// ============================================================================
// TYPES
// ============================================================================

interface ExecutionRow {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  is_shadow: boolean;
  shadow_divergence: unknown | null;
}

interface ChecklistItem {
  id: string;
  label: string;
  pass: boolean;
  value: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function diffMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return new Date(end).getTime() - new Date(start).getTime();
}

function msToDays(ms: number): number {
  return ms / (1000 * 60 * 60 * 24);
}

// ============================================================================
// GET /api/admin/conductor/workflows/[id]/shadow
// ============================================================================

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processId } = await props.params;

    // Auth check via anon/session client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Use service role for data queries (bypasses RLS cleanly)
    const db = createServiceRoleClient();

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // ---- FETCH EXECUTIONS IN PARALLEL ----
    const [shadowResult, liveResult] = await Promise.all([
      db
        .from('workflow_executions')
        .select('id, status, started_at, completed_at, is_shadow, shadow_divergence')
        .eq('process_id', processId)
        .eq('is_shadow', true),
      db
        .from('workflow_executions')
        .select('id, status, started_at, completed_at, is_shadow, shadow_divergence')
        .eq('process_id', processId)
        .eq('is_shadow', false)
        .not('completed_at', 'is', null)
        .gte('started_at', since),
    ]);

    if (shadowResult.error) throw shadowResult.error;
    if (liveResult.error) throw liveResult.error;

    const shadowExecutions: ExecutionRow[] = shadowResult.data ?? [];
    const liveExecutions: ExecutionRow[] = liveResult.data ?? [];

    // ---- LIVE STATS ----
    const liveTotal = liveExecutions.length;
    const liveCompleted = liveExecutions.filter((e) => e.status === 'completed');

    const liveDurationsMs = liveCompleted
      .map((e) => diffMs(e.started_at, e.completed_at))
      .filter((ms): ms is number => ms !== null && ms > 0);

    const liveAvgDurationDays =
      liveDurationsMs.length > 0
        ? Math.round(
            (liveDurationsMs.reduce((a, b) => a + b, 0) / liveDurationsMs.length / (1000 * 60 * 60 * 24)) * 10
          ) / 10
        : 0;

    // humanIntervened: count distinct live execution_ids that have a HITL task completed
    let liveHumanIntervened = 0;
    if (liveExecutions.length > 0) {
      const liveIds = liveExecutions.map((e) => e.id);
      const { data: hitlTasks, error: hitlError } = await db
        .from('workflow_tasks')
        .select('execution_id')
        .in('execution_id', liveIds)
        .eq('completion_mode', 'hitl')
        .eq('status', 'completed');

      if (hitlError) throw hitlError;

      const distinctHitlExecIds = new Set((hitlTasks ?? []).map((t: { execution_id: string }) => t.execution_id));
      liveHumanIntervened = distinctHitlExecIds.size;
    }

    // ---- SHADOW STATS ----
    const shadowTotal = shadowExecutions.length;
    const shadowCompleted = shadowExecutions.filter((e) => e.status === 'completed');

    const shadowDurationsMs = shadowCompleted
      .map((e) => diffMs(e.started_at, e.completed_at))
      .filter((ms): ms is number => ms !== null && ms > 0);

    const shadowAvgDurationDays =
      shadowDurationsMs.length > 0
        ? Math.round(
            (shadowDurationsMs.reduce((a, b) => a + b, 0) / shadowDurationsMs.length / (1000 * 60 * 60 * 24)) * 10
          ) / 10
        : 0;

    const shadowWithDivergence = shadowExecutions.filter((e) => e.shadow_divergence !== null);
    const wouldHaveIntervened = shadowWithDivergence.length;

    const divergenceRate =
      shadowTotal > 0
        ? Math.round((wouldHaveIntervened / shadowTotal) * 1000) / 10
        : 0;

    // shadowDays: days since first shadow execution started
    const shadowStartDates = shadowExecutions
      .map((e) => e.started_at)
      .filter((d): d is string => d !== null)
      .map((d) => new Date(d).getTime());

    const shadowDays =
      shadowStartDates.length > 0
        ? Math.floor(msToDays(Date.now() - Math.min(...shadowStartDates)))
        : 0;

    // cleanShadowRuns: shadow completed with no divergence
    const cleanShadowRuns = shadowCompleted.filter((e) => e.shadow_divergence === null).length;

    // ---- CONFORMANCE RATE ----
    // Fetch from process_conformance_snapshots or derive from pattern confidence
    // Use the conformance endpoint's logic: query process_conformance_snapshots
    let conformanceRate = 0;
    const { data: conformanceData } = await db
      .from('process_conformance_snapshots')
      .select('conformance_rate')
      .eq('process_id', processId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conformanceData?.conformance_rate != null) {
      conformanceRate = Math.round(conformanceData.conformance_rate);
    }

    // ---- DIVERGENCES LIST (up to 20) ----
    const divergences = shadowWithDivergence.slice(0, 20).map((e) => ({
      executionId: e.id,
      divergence: e.shadow_divergence,
    }));

    // ---- GO-LIVE CHECKLIST ----
    const goLiveChecklist: ChecklistItem[] = [
      {
        id: 'divergence_rate',
        label: 'Divergence rate < 10%',
        pass: divergenceRate < 10,
        value: `${divergenceRate.toFixed(1)}%`,
      },
      {
        id: 'shadow_days',
        label: '30+ days shadow running',
        pass: shadowDays >= 30,
        value: `${shadowDays} days`,
      },
      {
        id: 'clean_runs',
        label: '50 clean shadow runs',
        pass: cleanShadowRuns >= 50,
        value: `${cleanShadowRuns}/50`,
      },
      {
        id: 'conformance',
        label: 'Conformance ≥ 90%',
        pass: conformanceRate >= 90,
        value: `${conformanceRate}%`,
      },
    ];

    const readyToPromote = goLiveChecklist.every((item) => item.pass);

    return NextResponse.json({
      live: {
        total: liveTotal,
        completed: liveCompleted.length,
        humanIntervened: liveHumanIntervened,
        avgDurationDays: liveAvgDurationDays,
      },
      shadow: {
        total: shadowTotal,
        completed: shadowCompleted.length,
        wouldHaveIntervened,
        avgDurationDays: shadowAvgDurationDays,
      },
      divergenceRate,
      shadowDays,
      cleanShadowRuns,
      conformanceRate,
      divergences,
      goLiveChecklist,
      readyToPromote,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
