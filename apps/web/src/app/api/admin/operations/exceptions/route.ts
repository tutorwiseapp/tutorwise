/**
 * GET /api/admin/operations/exceptions
 * List exceptions with filtering by status, severity, source.
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

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status'); // open, claimed, resolved, dismissed
    const severity = searchParams.get('severity'); // low, medium, high, critical
    const source = searchParams.get('source');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let query = supabase
      .from('workflow_exceptions')
      .select('*, claimed_by_profile:profiles!workflow_exceptions_claimed_by_fkey(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);
    if (source) query = query.eq('source', source);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
