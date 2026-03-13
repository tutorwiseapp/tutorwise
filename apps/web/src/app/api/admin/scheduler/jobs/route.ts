/**
 * GET /api/admin/scheduler/jobs — list all cron/recurring jobs with last run info
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch all recurring/cron items
    const { data: jobs, error } = await supabase
      .from('scheduled_items')
      .select('*')
      .or('type.eq.cron_job,type.eq.sql_func,recurrence.neq.null')
      .order('title', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch last run for each job
    const jobIds = (jobs || []).map((j: { id: string }) => j.id);
    let lastRuns: Record<string, { started_at: string; status: string; duration_ms: number | null }> = {};

    if (jobIds.length > 0) {
      const { data: runs } = await supabase
        .from('scheduler_runs')
        .select('item_id, started_at, status, duration_ms')
        .in('item_id', jobIds)
        .order('started_at', { ascending: false })
        .limit(200);

      if (runs) {
        // Keep only the latest run per item
        for (const run of runs) {
          if (!lastRuns[run.item_id]) {
            lastRuns[run.item_id] = {
              started_at: run.started_at,
              status: run.status,
              duration_ms: run.duration_ms,
            };
          }
        }
      }
    }

    const data = (jobs || []).map((job: Record<string, unknown>) => ({
      ...job,
      last_run: lastRuns[(job as { id: string }).id] || null,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
