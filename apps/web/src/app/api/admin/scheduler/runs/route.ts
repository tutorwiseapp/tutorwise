/**
 * GET /api/admin/scheduler/runs — list execution history from scheduler_runs
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

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let query = supabase
      .from('scheduler_runs')
      .select('*, scheduled_items!inner(title, type)')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (itemId) query = query.eq('item_id', itemId);
    if (status) query = query.eq('status', status);

    const { data: runs, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Flatten the joined data
    const data = (runs || []).map((run: Record<string, unknown>) => {
      const item = run.scheduled_items as { title: string; type: string } | null;
      return {
        id: run.id,
        item_id: run.item_id,
        item_title: item?.title || 'Unknown',
        item_type: item?.type || 'unknown',
        status: run.status,
        started_at: run.started_at,
        completed_at: run.completed_at,
        duration_ms: run.duration_ms,
        error: run.error,
        attempt: run.attempt,
      };
    });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
