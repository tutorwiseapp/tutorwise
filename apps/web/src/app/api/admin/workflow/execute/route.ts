/**
 * GET /api/admin/workflow/execute
 * List workflow executions (optionally filtered by processId or status).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('processId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    let query = supabase
      .from('workflow_executions')
      .select(`
        id, process_id, status, is_shadow, execution_context,
        started_at, completed_at,
        process:process_id ( name, category, execution_mode )
      `)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (processId) query = query.eq('process_id', processId);
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      query = statuses.length === 1 ? query.eq('status', statuses[0]) : query.in('status', statuses);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ executions: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
