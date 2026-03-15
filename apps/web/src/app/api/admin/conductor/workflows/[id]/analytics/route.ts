/*
 * Filename: src/app/api/admin/conductor/workflows/[id]/analytics/route.ts
 * Purpose: Process Mining — execution analytics, path analysis, cycle times, and AI patterns
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
}

interface TaskRow {
  execution_id: string;
  node_id: string;
  started_at: string | null;
  completed_at: string | null;
}

interface ProcessNode {
  id: string;
  data?: { label?: string; type?: string };
}

// ============================================================================
// HELPERS
// ============================================================================

function diffMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return new Date(end).getTime() - new Date(start).getTime();
}

function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60);
}

function msToDays(ms: number): number {
  return ms / (1000 * 60 * 60 * 24);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ============================================================================
// GET /api/admin/conductor/workflows/[id]/analytics
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

    // Parallel: fetch process nodes + executions
    const [processResult, executionsResult] = await Promise.all([
      db
        .from('workflow_processes')
        .select('nodes')
        .eq('id', processId)
        .single(),
      db
        .from('workflow_executions')
        .select('id, status, started_at, completed_at')
        .eq('process_id', processId)
        .eq('is_shadow', false)
        .gte('started_at', since),
    ]);

    if (processResult.error) throw processResult.error;
    if (executionsResult.error) throw executionsResult.error;

    const processNodes: ProcessNode[] = processResult.data?.nodes ?? [];
    const nodeLabelMap = new Map<string, string>(
      processNodes.map((n) => [n.id, n.data?.label ?? n.id])
    );

    const executions: ExecutionRow[] = executionsResult.data ?? [];
    const executionIds = executions.map((e) => e.id);

    // Fetch tasks for all executions (skip if none)
    let allTasks: TaskRow[] = [];
    if (executionIds.length > 0) {
      const { data: tasksData, error: tasksError } = await db
        .from('workflow_tasks')
        .select('execution_id, node_id, started_at, completed_at')
        .in('execution_id', executionIds)
        .order('started_at', { ascending: true });

      if (tasksError) throw tasksError;
      allTasks = tasksData ?? [];
    }

    // Parallel: fetch AI patterns
    const patternsPromise = db
      .from('process_patterns')
      .select('id, pattern_type, ai_summary, confidence, occurrence_count, conditions')
      .eq('process_id', processId)
      .order('confidence', { ascending: false })
      .limit(5);

    // ---- SUMMARY ----
    const total = executions.length;
    const completed = executions.filter((e) => e.status === 'completed');
    const failed = executions.filter((e) => e.status === 'failed').length;
    const abandoned = executions.filter((e) => e.status === 'abandoned' || e.status === 'cancelled').length;

    const completedCycleMs = completed
      .map((e) => diffMs(e.started_at, e.completed_at))
      .filter((ms): ms is number => ms !== null && ms > 0);

    const avgCycleDays =
      completedCycleMs.length > 0
        ? Math.round((completedCycleMs.reduce((a, b) => a + b, 0) / completedCycleMs.length / (1000 * 60 * 60 * 24)) * 10) / 10
        : 0;

    const fastestHours =
      completedCycleMs.length > 0
        ? Math.round(msToHours(Math.min(...completedCycleMs)) * 10) / 10
        : 0;

    const slowestDays =
      completedCycleMs.length > 0
        ? Math.round(msToDays(Math.max(...completedCycleMs)) * 10) / 10
        : 0;

    // ---- PATHS ----
    const tasksByExecution = new Map<string, TaskRow[]>();
    for (const task of allTasks) {
      const list = tasksByExecution.get(task.execution_id) ?? [];
      list.push(task);
      tasksByExecution.set(task.execution_id, list);
    }

    const pathCounts = new Map<string, number>();
    for (const exec of executions) {
      const tasks = tasksByExecution.get(exec.id) ?? [];
      // tasks already sorted by started_at from DB query
      const pathStr = tasks.map((t) => t.node_id).join('→');
      if (pathStr) {
        pathCounts.set(pathStr, (pathCounts.get(pathStr) ?? 0) + 1);
      }
    }

    const paths = Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({
        path,
        count,
        pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }));

    // ---- CYCLE TIME BY NODE ----
    const nodeTimeAccum = new Map<string, number[]>();
    for (const task of allTasks) {
      const durationMs = diffMs(task.started_at, task.completed_at);
      if (durationMs === null || durationMs <= 0) continue;
      const list = nodeTimeAccum.get(task.node_id) ?? [];
      list.push(durationMs);
      nodeTimeAccum.set(task.node_id, list);
    }

    const cycleTimeByNodeRaw = Array.from(nodeTimeAccum.entries()).map(([nodeId, durations]) => {
      const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
      return { nodeId, avgHours: msToHours(avgMs) };
    });

    // Identify bottleneck: avgHours > 2× median avgHours across all nodes
    const allAvgHours = cycleTimeByNodeRaw.map((n) => n.avgHours);
    const medianAvgHours = median(allAvgHours);

    const cycleTimeByNode = cycleTimeByNodeRaw.map((n) => ({
      nodeId: n.nodeId,
      nodeLabel: nodeLabelMap.get(n.nodeId) ?? n.nodeId,
      avgHours: Math.round(n.avgHours * 10) / 10,
      isBottleneck: n.avgHours > 2 * medianAvgHours,
    }));

    // ---- PATTERNS ----
    const { data: patternsData } = await patternsPromise;
    const patterns = (patternsData ?? []).map((p: {
      id: string;
      pattern_type: string;
      ai_summary: string;
      confidence: number;
      occurrence_count: number;
      conditions: unknown;
    }) => ({
      id: p.id,
      type: p.pattern_type,
      summary: p.ai_summary,
      confidence: p.confidence,
      occurrenceCount: p.occurrence_count,
    }));

    return NextResponse.json({
      summary: {
        total,
        completed: completed.length,
        failed,
        abandoned,
        avgCycleDays,
        fastestHours,
        slowestDays,
      },
      paths,
      cycleTimeByNode,
      patterns,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
