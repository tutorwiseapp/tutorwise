/*
 * Filename: src/app/api/admin/conductor/workflows/[id]/promote/route.ts
 * Purpose: Process Mining — enforce go-live checklist, then promote process from shadow to live
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

function msToDays(ms: number): number {
  return ms / (1000 * 60 * 60 * 24);
}

// ============================================================================
// POST /api/admin/conductor/workflows/[id]/promote
// ============================================================================

export async function POST(
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
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Use service role for data queries (bypasses RLS cleanly)
    const db = createServiceRoleClient();

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // ---- INLINE CHECKLIST COMPUTATION (mirrors shadow API) ----

    const [shadowResult, liveResult] = await Promise.all([
      db
        .from('workflow_executions')
        .select('id, status, started_at, completed_at, shadow_divergence')
        .eq('process_id', processId)
        .eq('is_shadow', true),
      db
        .from('workflow_executions')
        .select('id, status, started_at, completed_at, shadow_divergence')
        .eq('process_id', processId)
        .eq('is_shadow', false)
        .not('completed_at', 'is', null)
        .gte('started_at', since),
    ]);

    if (shadowResult.error) throw shadowResult.error;
    if (liveResult.error) throw liveResult.error;

    const shadowExecutions: ExecutionRow[] = shadowResult.data ?? [];
    const liveExecutions: ExecutionRow[] = liveResult.data ?? [];

    // Shadow divergence metrics
    const shadowTotal = shadowExecutions.length;
    const shadowCompleted = shadowExecutions.filter((e) => e.status === 'completed');
    const shadowWithDivergence = shadowExecutions.filter((e) => e.shadow_divergence !== null);

    const divergenceRate =
      shadowTotal > 0
        ? Math.round((shadowWithDivergence.length / shadowTotal) * 1000) / 10
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

    // Conformance rate from latest snapshot
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

    // Suppress unused variable warning — liveExecutions fetched for symmetry with shadow API
    void liveExecutions;

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

    const checklistFailed = goLiveChecklist.filter((item) => !item.pass);

    if (checklistFailed.length > 0) {
      return NextResponse.json(
        {
          error: 'Process not ready for live promotion',
          checklistFailed,
        },
        { status: 400 }
      );
    }

    // ---- PROMOTE: execution_mode → 'live' ----
    const { error: updateError } = await db
      .from('workflow_processes')
      .update({ execution_mode: 'live', updated_at: new Date().toISOString() })
      .eq('id', processId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      newMode: 'live',
      processId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
