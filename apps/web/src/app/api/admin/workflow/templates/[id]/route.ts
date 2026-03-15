import { NextResponse } from 'next/server';
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
 * PATCH /api/admin/workflow/templates/[id]
 * Update a template
 */
export async function PATCH(
  request: Request,
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

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    const allowedFields = ['name', 'description', 'category', 'complexity', 'nodes', 'edges', 'preview_steps', 'tags'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('workflow_process_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update template', code: 'DB_ERROR' },
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
 * DELETE /api/admin/workflow/templates/[id]
 * Delete a template
 */
export async function DELETE(
  _request: Request,
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
      .from('workflow_process_templates')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete template', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
