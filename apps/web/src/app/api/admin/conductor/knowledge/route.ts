/*
 * Filename: src/app/api/admin/conductor/knowledge/route.ts
 * Purpose: Platform Knowledge Base CRUD — list and create chunks
 * Phase: Conductor 4A
 * Created: 2026-03-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateEmbeddingForStorage } from '@/lib/services/embeddings';

export const dynamic = 'force-dynamic';

/** GET /api/admin/conductor/knowledge — list all chunks */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabase
      .from('platform_knowledge_chunks')
      .select('id, title, content, category, source_ref, tags, created_at, updated_at')
      .order('category', { ascending: true })
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/** POST /api/admin/conductor/knowledge — create chunk + generate embedding */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, content, category, source_ref, tags } = body;

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'title, content, category are required' }, { status: 400 });
    }

    // Generate 768-dim embedding
    const embeddingText = `${title}\n\n${content}`;
    const embedding = await generateEmbeddingForStorage(embeddingText);

    const { data, error } = await supabase
      .from('platform_knowledge_chunks')
      .insert({
        title,
        content,
        embedding,
        category,
        source_ref: source_ref ?? null,
        tags: tags ?? [],
        created_by: user.id,
      })
      .select('id, title, content, category, source_ref, tags, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
