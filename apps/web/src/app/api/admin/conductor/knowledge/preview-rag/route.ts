/*
 * Filename: src/app/api/admin/conductor/knowledge/preview-rag/route.ts
 * Purpose: Preview RAG retrieval for a test query against platform_knowledge_chunks
 * Phase: Conductor 4A
 * Created: 2026-03-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/lib/services/embeddings';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/conductor/knowledge/preview-rag
 * Body: { query: string; category?: string; threshold?: number }
 * Returns: top 5 matching chunks with similarity scores
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { query, category, threshold = 0.4 } = body;

    if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 });

    // Generate query embedding
    const embedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_platform_knowledge_chunks', {
      query_embedding: JSON.stringify(embedding),
      match_category: category ?? null,
      match_count: 5,
      match_threshold: threshold,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
