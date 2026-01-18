/**
 * Filename: apps/web/src/app/api/resources/articles/[slug]/route.ts
 * Purpose: Public API route for fetching individual published resource articles by slug
 * Created: 2026-01-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();

    const { data: article, error } = await supabase
      .from('resource_articles')
      .select('*')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .single();

    if (error || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await supabase
      .from('resource_articles')
      .update({ view_count: (article.view_count || 0) + 1 })
      .eq('id', article.id);

    return NextResponse.json({ article }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/resources/articles/[slug]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
