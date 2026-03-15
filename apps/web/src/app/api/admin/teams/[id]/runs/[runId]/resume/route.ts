/**
 * POST /api/admin/teams/[id]/runs/[runId]/resume
 *
 * Phase 6C: Resumes a HITL-paused team run after admin review.
 * The run must be in 'awaiting_approval' status (paused after specialist outputs,
 * before coordinator synthesis).
 *
 * Body: { approved: boolean }
 * Returns: TeamRunResult with final team_result
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { runId } = await params;
    const body = await request.json() as { approved: boolean };

    if (typeof body.approved !== 'boolean') {
      return NextResponse.json({ error: 'approved (boolean) is required' }, { status: 400 });
    }

    const { teamRuntime } = await import('@/lib/workflow/team-runtime/TeamRuntime');
    const result = await teamRuntime.resume(runId, body.approved);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';

    // Write exception for team resume failure (fire-and-forget)
    const { id: teamId, runId: rId } = await params;
    import('@/lib/workflow/exception-writer').then(async ({ writeException }) => {
      const { createServiceRoleClient: createSRC } = await import('@/utils/supabase/server');
      const supa = createSRC();
      writeException({
        supabase: supa,
        source: 'team_error',
        severity: 'high',
        title: `Team run resume failed`,
        description: message,
        sourceEntityType: 'agent_team_run_outputs',
        sourceEntityId: rId,
        context: { teamId: teamId, runId: rId },
      });
    }).catch((err) => { console.error('[team-resume] Exception write failed:', err); });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
