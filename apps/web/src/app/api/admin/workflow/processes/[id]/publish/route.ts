import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase, user: null, error: 'Unauthorized' as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { supabase, user: null, error: 'Forbidden' as const };
  return { supabase, user, error: null };
}

/**
 * POST /api/admin/workflow/processes/[id]/publish
 *
 * Copies draft_nodes/draft_edges → nodes/edges on the process,
 * increments current_version, and creates an immutable snapshot
 * row in workflow_process_versions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, error: authError } = await requireAdmin();

    if (authError || !user) {
      const status = authError === 'Unauthorized' ? 401 : 403;
      return NextResponse.json(
        { success: false, error: authError || 'Unauthorized', code: authError === 'Forbidden' ? 'ADMIN_REQUIRED' : 'AUTH_REQUIRED' },
        { status }
      );
    }

    // Optional notes from body
    const body = await request.json().catch(() => ({}));
    const notes: string | null = body.notes ?? null;

    // Fetch current process state
    const { data: process, error: fetchErr } = await supabase
      .from('workflow_processes')
      .select('id, nodes, edges, draft_nodes, draft_edges, current_version')
      .eq('id', id)
      .single();

    if (fetchErr || !process) {
      return NextResponse.json(
        { success: false, error: 'Process not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const publishNodes = process.draft_nodes ?? process.nodes ?? [];
    const publishEdges = process.draft_edges ?? process.edges ?? [];
    const newVersion = (process.current_version ?? 0) + 1;

    // Insert version snapshot
    const { error: versionErr } = await supabase
      .from('workflow_process_versions')
      .insert({
        process_id: id,
        version_number: newVersion,
        nodes: publishNodes,
        edges: publishEdges,
        published_by: user.id,
        notes,
      });

    if (versionErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to create version snapshot', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Promote draft → live nodes/edges on the process
    const { data: updated, error: updateErr } = await supabase
      .from('workflow_processes')
      .update({
        nodes: publishNodes,
        edges: publishEdges,
        current_version: newVersion,
        published_at: new Date().toISOString(),
        published_by: user.id,
        updated_by: user.id,
      })
      .eq('id', id)
      .select('id, current_version, published_at')
      .single();

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to promote draft', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        processId: id,
        version: newVersion,
        publishedAt: updated.published_at,
        nodeCount: Array.isArray(publishNodes) ? publishNodes.length : 0,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
