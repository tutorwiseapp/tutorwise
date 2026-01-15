/**
 * Filename: apps/web/src/app/api/blog/articles/route.ts
 * Purpose: Public API route for fetching published blog articles
 * Created: 2026-01-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const limit = searchParams.get('limit');

    let query = supabase
      .from('blog_articles')
      .select('*')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Limit results if specified
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const { data: articles, error } = await query;

    if (error) {
      console.error('Error fetching published articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    return NextResponse.json({ articles: articles || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/blog/articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
