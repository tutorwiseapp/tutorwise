/**
 * GET /api/cron/workflow-trigger-fallback
 * Fallback cron — catches profiles stuck in 'under_review' that missed the
 * Supabase DB webhook trigger (e.g. due to network failure or DLQ exhaustion).
 *
 * Logic:
 *   1. Find profiles where status = 'under_review' AND updated_at < now() - 60 min
 *   2. For each, check if there's already an active (running|paused) workflow execution
 *   3. If not, start the Tutor Approval workflow for that profile
 *
 * Schedule: run every 30 minutes via pg_cron.
 * Idempotent: duplicate executions are prevented by the dedup index (migration 346).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/workflow/runtime/PlatformWorkflowRuntime';

export const dynamic = 'force-dynamic';

const STUCK_THRESHOLD_MINUTES = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Find the Tutor Approval process
  const { data: approvalProcess } = await supabase
    .from('workflow_processes')
    .select('id, execution_mode')
    .eq('name', 'Tutor Approval')
    .single();

  if (!approvalProcess) {
    return NextResponse.json({ success: true, skipped: true, reason: 'process not found' });
  }

  if (approvalProcess.execution_mode === 'design') {
    return NextResponse.json({ success: true, skipped: true, reason: 'design mode' });
  }

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  // Find profiles stuck in under_review
  const { data: stuckProfiles, error } = await supabase
    .from('profiles')
    .select('id, updated_at')
    .eq('status', 'under_review')
    .lt('updated_at', cutoff);

  if (error) {
    console.error('[Trigger Fallback] Failed to query profiles:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!stuckProfiles || stuckProfiles.length === 0) {
    return NextResponse.json({ success: true, triggered: 0 });
  }

  const results = { triggered: 0, alreadyActive: 0, failed: 0 };

  for (const profile of stuckProfiles) {
    // Check if there's already an active execution for this profile
    const { count } = await supabase
      .from('workflow_executions')
      .select('id', { count: 'exact', head: true })
      .eq('process_id', approvalProcess.id)
      .in('status', ['running', 'paused'])
      .contains('execution_context', { profile_id: profile.id });

    if ((count ?? 0) > 0) {
      results.alreadyActive++;
      continue;
    }

    try {
      // Fetch email for context
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;

      await workflowRuntime.start(approvalProcess.id, {
        profile_id: profile.id,
        email: email ?? null,
        caas_score: 0,
        is_shadow: approvalProcess.execution_mode === 'shadow',
        _trigger: 'fallback_cron',
      });

      console.log(`[Trigger Fallback] Started Tutor Approval for stuck profile ${profile.id}`);
      results.triggered++;
    } catch (err) {
      console.error(`[Trigger Fallback] Failed to start execution for profile ${profile.id}:`, err);
      results.failed++;
    }
  }

  console.log('[Trigger Fallback] Complete:', results);
  return NextResponse.json({ success: true, ...results });
}
