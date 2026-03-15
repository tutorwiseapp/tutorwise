/*
 * Filename: src/app/api/admin/conductor/knowledge/[id]/route.ts
 * Purpose: Platform Knowledge Base — update and delete individual chunks
 * Phase: Conductor 4A
 * Created: 2026-03-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateEmbeddingForStorage } from '@/lib/services/embeddings';

export const dynamic = 'force-dynamic';

/** PATCH /api/admin/conductor/knowledge/[id] — update chunk (re-embed if content changed) */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { title, content, category, source_ref, tags } = body;

    // Check existing chunk
    const { data: existing, error: fetchError } = await supabase
      .from('platform_knowledge_chunks')
      .select('id, title, content')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Chunk not found' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (title !== undefined) updatePayload.title = title;
    if (category !== undefined) updatePayload.category = category;
    if (source_ref !== undefined) updatePayload.source_ref = source_ref;
    if (tags !== undefined) updatePayload.tags = tags;
    if (content !== undefined) updatePayload.content = content;

    // Re-generate embedding only if title or content changed
    const newTitle = title ?? existing.title;
    const newContent = content ?? existing.content;
    if (title !== undefined || content !== undefined) {
      updatePayload.embedding = await generateEmbeddingForStorage(`${newTitle}\n\n${newContent}`);
    }

    const { data, error } = await supabase
      .from('platform_knowledge_chunks')
      .update(updatePayload)
      .eq('id', id)
      .select('id, title, content, category, source_ref, tags, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/conductor/knowledge/[id] — remove chunk */
export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error } = await supabase
      .from('platform_knowledge_chunks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
