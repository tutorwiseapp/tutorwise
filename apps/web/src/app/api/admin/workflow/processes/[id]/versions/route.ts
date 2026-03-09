import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/workflow/processes/[id]/versions
 *
 * Returns all published version snapshots for a process,
 * newest first. Includes metadata but NOT nodes/edges by default.
 * Pass ?full=true to include nodes/edges (used by Restore).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const full = searchParams.get('full') === 'true';

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const selectFields = full
      ? 'id, process_id, version_number, nodes, edges, published_by, published_at, notes'
      : 'id, process_id, version_number, published_by, published_at, notes';

    const { data, error } = await supabase
      .from('workflow_process_versions')
      .select(selectFields)
      .eq('process_id', id)
      .order('version_number', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch versions', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
