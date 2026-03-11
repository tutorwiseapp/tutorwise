/**
 * GET /api/cron/shadow-reconcile
 * Shadow divergence reconciliation cron.
 *
 * Runs hourly. For every shadow execution that completed > 5 minutes ago
 * and has no shadow_divergence recorded yet, compares the engine's intended
 * execution path against actual DB state and flags any mismatches.
 *
 * Divergence signals checked per process type:
 *
 *   Booking Lifecycle (Human/AI Tutor):
 *     — booking.payment_status === 'Paid'  (legacy Stripe webhook fired)
 *     — a commission transaction exists for this booking (handle_successful_payment RPC ran)
 *
 *   Tutor Approval:
 *     — profiles.status !== 'under_review' (was processed by engine or admin)
 *
 * If any signals are missing, shadow_divergence is populated with { issues: [...] }.
 * Clean executions are marked with { reconciled_at: ISO, issues: [] }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// Only check executions that completed at least this long ago (ms)
const RECONCILE_DELAY_MS = 5 * 60 * 1000; // 5 minutes

interface ShadowExecution {
  id: string;
  process_id: string;
  execution_context: Record<string, unknown>;
  completed_at: string;
  process: { name: string } | null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - RECONCILE_DELAY_MS).toISOString();

  // Fetch shadow executions that completed > 5 min ago with no divergence recorded
  const { data: candidates, error } = await supabase
    .from('workflow_executions')
    .select('id, process_id, execution_context, completed_at, process:process_id(name)')
    .eq('is_shadow', true)
    .eq('status', 'completed')
    .is('shadow_divergence', null)
    .lt('completed_at', cutoff)
    .limit(100);

  if (error) {
    console.error('[Shadow Reconcile] Query failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ success: true, reconciled: 0 });
  }

  const results = { reconciled: 0, diverged: 0, errors: 0 };
  const now = new Date().toISOString();

  for (const execution of (candidates as unknown) as ShadowExecution[]) {
    try {
      const issues: string[] = [];
      const processName = (execution.process as { name: string } | null)?.name ?? '';
      const ctx = execution.execution_context;

      // --- Booking Lifecycle checks ---
      if (processName.startsWith('Booking Lifecycle')) {
        const bookingId = ctx.booking_id as string | undefined;

        if (!bookingId) {
          issues.push('execution_context missing booking_id');
        } else {
          // Check booking payment status
          const { data: booking } = await supabase
            .from('bookings')
            .select('id, payment_status')
            .eq('id', bookingId)
            .maybeSingle();

          if (!booking) {
            issues.push(`booking ${bookingId} not found in DB`);
          } else if (booking.payment_status !== 'Paid') {
            issues.push(`booking ${bookingId} payment_status = '${booking.payment_status}' (expected 'Paid')`);
          }

          // Check that a commission transaction was created
          const { count: commissionCount } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('booking_id', bookingId)
            .eq('type', 'Tutoring Payout');

          if ((commissionCount ?? 0) === 0) {
            issues.push(`no Tutoring Payout transaction found for booking ${bookingId}`);
          }
        }
      }

      // --- Tutor Approval checks ---
      else if (processName === 'Tutor Approval') {
        const profileId = ctx.profile_id as string | undefined;

        if (!profileId) {
          issues.push('execution_context missing profile_id');
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, status')
            .eq('id', profileId)
            .maybeSingle();

          if (!profile) {
            issues.push(`profile ${profileId} not found`);
          } else if (profile.status === 'under_review') {
            // Still under_review after engine completed — likely a HITL approval is pending, not a real divergence
            // Only flag if it's been a very long time (> 24h)
            const completedAt = new Date(execution.completed_at).getTime();
            const hoursSinceComplete = (Date.now() - completedAt) / 3600000;
            if (hoursSinceComplete > 24) {
              issues.push(`profile ${profileId} still 'under_review' ${hoursSinceComplete.toFixed(0)}h after engine completed`);
            }
          }
        }
      }

      // Write result
      const divergence = issues.length > 0
        ? { issues, reconciled_at: now }
        : { issues: [], reconciled_at: now };

      await supabase
        .from('workflow_executions')
        .update({ shadow_divergence: divergence })
        .eq('id', execution.id);

      results.reconciled++;
      if (issues.length > 0) {
        results.diverged++;
        // Write shadow divergence exception
        const { writeException } = await import('@/lib/workflow/exception-writer');
        await writeException({
          supabase,
          source: 'shadow_divergence',
          severity: issues.length > 3 ? 'high' : 'medium',
          title: `Shadow divergence: ${processName || 'Unknown process'}`,
          description: `${issues.length} issue(s) detected`,
          sourceEntityType: 'workflow_execution',
          sourceEntityId: execution.id,
          context: { issues },
        });
      }
    } catch (err) {
      console.error(`[Shadow Reconcile] Failed for execution ${execution.id}:`, err);
      results.errors++;
    }
  }

  console.log('[Shadow Reconcile] Complete:', results);

  // HITL timeout detection: flag pending HITL tasks older than 24 hours
  try {
    const hitlCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stuckTasks } = await supabase
      .from('workflow_tasks')
      .select('id, name, execution_id, node_id, created_at')
      .eq('status', 'pending')
      .eq('completion_mode', 'hitl')
      .lt('created_at', hitlCutoff)
      .limit(50);

    for (const task of stuckTasks ?? []) {
      // Check if we already wrote an exception for this task
      const { count: existingCount } = await supabase
        .from('workflow_exceptions')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'hitl_timeout')
        .eq('source_entity_id', task.id);

      if ((existingCount ?? 0) > 0) continue;

      const hoursStuck = Math.floor((Date.now() - new Date(task.created_at).getTime()) / 3600000);
      const { writeException } = await import('@/lib/workflow/exception-writer');
      await writeException({
        supabase,
        source: 'hitl_timeout',
        severity: hoursStuck > 72 ? 'high' : 'medium',
        title: `HITL task pending for ${hoursStuck}h: ${task.name || task.node_id}`,
        description: `Task ${task.id.slice(0, 8)} has been awaiting human approval for ${hoursStuck} hours`,
        sourceEntityType: 'workflow_task',
        sourceEntityId: task.id,
        context: { execution_id: task.execution_id, hours_stuck: hoursStuck },
      });
    }
  } catch (hitlError) {
    console.error('[shadow-reconcile] HITL timeout check error:', hitlError);
    // Non-fatal — continue
  }

  // Phase 5: Batch conformance check for executions completed in the last hour
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentlyCompleted } = await supabase
      .from('workflow_executions')
      .select('id, process_id, workflow_processes(nodes, edges)')
      .eq('status', 'completed')
      .eq('is_shadow', false)
      .gte('completed_at', oneHourAgo);

    for (const exec of recentlyCompleted ?? []) {
      // Skip if already checked (conformance_deviations has a row for this execution)
      const { count: existingCount } = await supabase
        .from('conformance_deviations')
        .select('id', { count: 'exact', head: true })
        .eq('execution_id', exec.id);

      if ((existingCount ?? 0) > 0) continue;

      // Load tasks for this execution
      const { data: tasks } = await supabase
        .from('workflow_tasks')
        .select('id, node_id, status, started_at, completed_at')
        .eq('execution_id', exec.id)
        .order('started_at', { ascending: true });

      const process = (exec as any).workflow_processes;
      if (!process?.nodes || !tasks) continue;

      // Import ConformanceChecker (dynamic to avoid issues)
      const { ConformanceChecker } = await import('@/lib/process-studio/conformance/ConformanceChecker');
      const result = ConformanceChecker.checkExecution(
        exec.id,
        { nodes: process.nodes, edges: process.edges ?? [] },
        tasks
      );

      if (result.deviations.length > 0) {
        const rows = result.deviations.map((dev) => ({
          execution_id: exec.id,
          process_id: exec.process_id,
          node_id: dev.nodeId,
          deviation_type: dev.type,
          expected_node_ids: dev.expectedNextIds,
          actual_node_id: dev.actualNextId,
        }));
        await supabase.from('conformance_deviations').insert(rows);

        // Write conformance exception
        const { writeException } = await import('@/lib/workflow/exception-writer');
        await writeException({
          supabase,
          source: 'conformance_deviation',
          severity: result.deviations.length > 3 ? 'high' : 'medium',
          title: `Conformance deviation: ${result.deviations.length} issue(s)`,
          description: result.deviations.map(d => `${d.type} at ${d.nodeId}`).join(', '),
          sourceEntityType: 'workflow_execution',
          sourceEntityId: exec.id,
          context: { process_id: exec.process_id, deviation_count: result.deviations.length },
        });
      }
      // Even if no deviations, we skip inserting anything — the execution is conformant
    }
  } catch (conformanceError) {
    console.error('[shadow-reconcile] Conformance batch check error:', conformanceError);
    // Non-fatal — continue
  }

  // Phase 5: Write conformance rate snapshots for processes that had completions in the last hour
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentExecs } = await supabase
      .from('workflow_executions')
      .select('process_id')
      .eq('status', 'completed')
      .eq('is_shadow', false)
      .gte('completed_at', oneHourAgo);

    const distinctProcessIds = [
      ...new Set((recentExecs ?? []).map((r: { process_id: string }) => r.process_id)),
    ];

    for (const processId of distinctProcessIds) {
      const { ConformanceChecker } = await import('@/lib/process-studio/conformance/ConformanceChecker');
      const batchResult = await ConformanceChecker.batchCheck(processId, supabase, 90);

      await supabase.from('process_conformance_snapshots').insert({
        process_id: processId,
        conformance_rate: batchResult.conformanceRate,
        total: batchResult.total,
        conformant_count: batchResult.conformant,
        deviated_count: batchResult.deviated,
      });
    }
  } catch (snapshotError) {
    console.error('[shadow-reconcile] Conformance snapshot error:', snapshotError);
    // Non-fatal — continue
  }

  return NextResponse.json({ success: true, ...results });
}
