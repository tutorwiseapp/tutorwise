/**
 * GET /api/admin/workflow/processes/[id]/shadow-stats
 * Returns shadow execution statistics for a specific process.
 * Used by GoLiveReadiness component to show progress toward the 50-run target.
 *
 * Response:
 *   { total, clean, diverged, lastRunAt, readyForLive }
 *
 * Definitions:
 *   total    — all shadow executions for this process (any status)
 *   clean    — shadow executions that completed with no shadow_divergence
 *   diverged — shadow executions with shadow_divergence populated
 *   ready    — clean >= 50 AND diverged === 0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const LIVE_READY_THRESHOLD = 50;

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processId } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all shadow executions for this process
    const { data: executions, error } = await supabase
      .from('workflow_executions')
      .select('id, status, shadow_divergence, started_at, completed_at')
      .eq('process_id', processId)
      .eq('is_shadow', true)
      .order('started_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = executions ?? [];
    const total = rows.length;
    const clean = rows.filter((e) => e.status === 'completed' && !e.shadow_divergence).length;
    const diverged = rows.filter((e) => e.shadow_divergence !== null).length;
    const lastRunAt = rows[0]?.started_at ?? null;
    const readyForLive = clean >= LIVE_READY_THRESHOLD && diverged === 0;

    // Breakdown by status
    const byStatus = rows.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        total,
        clean,
        diverged,
        lastRunAt,
        readyForLive,
        threshold: LIVE_READY_THRESHOLD,
        byStatus,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
