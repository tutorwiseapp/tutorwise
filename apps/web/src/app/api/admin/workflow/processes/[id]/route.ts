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
 * GET /api/admin/workflow/processes/[id]
 * Fetch a single workflow process with full nodes/edges
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, error: authError } = await requireAdmin();

    if (authError) {
      const status = authError === 'Unauthorized' ? 401 : 403;
      return NextResponse.json(
        { success: false, error: authError, code: authError === 'Unauthorized' ? 'AUTH_REQUIRED' : 'ADMIN_REQUIRED' },
        { status }
      );
    }

    const { data, error } = await supabase
      .from('workflow_processes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Process not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/workflow/processes/[id]
 * Update a workflow process (partial update)
 */
export async function PATCH(
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

    const body = await request.json();
    const allowedFields = ['name', 'description', 'category', 'nodes', 'edges', 'draft_nodes', 'draft_edges'];
    const updates: Record<string, unknown> = { updated_by: user.id };

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('workflow_processes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update process', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/workflow/processes/[id]
 * Delete a workflow process
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, error: authError } = await requireAdmin();

    if (authError) {
      const status = authError === 'Unauthorized' ? 401 : 403;
      return NextResponse.json(
        { success: false, error: authError, code: authError === 'Unauthorized' ? 'AUTH_REQUIRED' : 'ADMIN_REQUIRED' },
        { status }
      );
    }

    const { error } = await supabase
      .from('workflow_processes')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete process', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
