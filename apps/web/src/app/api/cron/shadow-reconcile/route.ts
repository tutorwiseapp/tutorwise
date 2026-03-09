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
      if (issues.length > 0) results.diverged++;
    } catch (err) {
      console.error(`[Shadow Reconcile] Failed for execution ${execution.id}:`, err);
      results.errors++;
    }
  }

  console.log('[Shadow Reconcile] Complete:', results);
  return NextResponse.json({ success: true, ...results });
}
