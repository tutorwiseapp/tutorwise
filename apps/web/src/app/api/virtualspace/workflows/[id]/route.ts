/**
 * PATCH /api/virtualspace/workflows/[id]  — update a custom workflow
 * DELETE /api/virtualspace/workflows/[id] — delete a custom workflow (owner only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only the creator can edit their own workflows
  const { data: existing } = await supabase
    .from('session_workflows')
    .select('id, built_in, created_by')
    .eq('id', id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.built_in) return NextResponse.json({ error: 'Cannot edit built-in workflows' }, { status: 403 });
  if (existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { name, description, short_description, phases, theme, tags, level, duration_mins, ai_involvement, sen_focus, published } = body;

  const { data, error } = await supabase
    .from('session_workflows')
    .update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(short_description !== undefined && { short_description }),
      ...(phases !== undefined && { phases }),
      ...(theme !== undefined && { theme }),
      ...(tags !== undefined && { tags }),
      ...(level !== undefined && { level }),
      ...(duration_mins !== undefined && { duration_mins }),
      ...(ai_involvement !== undefined && { ai_involvement }),
      ...(sen_focus !== undefined && { sen_focus }),
      ...(published !== undefined && { published }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[workflows PATCH]', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ workflow: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('session_workflows')
    .select('id, built_in, created_by')
    .eq('id', id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.built_in) return NextResponse.json({ error: 'Cannot delete built-in workflows' }, { status: 403 });
  if (existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase.from('session_workflows').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
