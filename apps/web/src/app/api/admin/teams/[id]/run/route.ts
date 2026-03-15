/**
 * POST /api/admin/teams/[id]/run
 * Runs an agent team with the given task. Returns the full team run output.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow scheduler service via CRON_SECRET (same pattern as /api/cron/* routes)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isSchedulerAuth = cronSecret && authHeader
      ? authHeader.length === `Bearer ${cronSecret}`.length && timingSafeEqual(Buffer.from(authHeader), Buffer.from(`Bearer ${cronSecret}`))
      : false;

    const supabase = await createClient();
    if (!isSchedulerAuth) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as { task: string; trigger_type?: string };

    if (!body.task) return NextResponse.json({ error: 'task is required' }, { status: 400 });

    // Load team
    const { data: team, error: teamError } = await supabase
      .from('agent_teams')
      .select('id, slug')
      .eq('id', id)
      .single();

    if (teamError || !team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    // Dynamically import to avoid loading LangGraph at build time
    const { teamRuntime } = await import('@/lib/workflow/team-runtime/TeamRuntime');
    const result = await teamRuntime.run(team.slug, body.task, body.trigger_type ?? 'manual');

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
