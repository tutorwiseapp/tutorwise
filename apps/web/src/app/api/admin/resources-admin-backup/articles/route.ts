/**
 * Filename: apps/web/src/app/api/admin/blog/articles/route.ts
 * Purpose: API routes for resource articles CRUD operations
 * Created: 2026-01-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/blog/articles
 * Fetch all resource articles (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can access

    // Fetch all articles
    const { data: articles, error } = await supabase
      .from('resource_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/blog/articles
 * Create a new resource article (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      slug,
      description,
      content,
      category,
      tags,
      featured_image_url,
      meta_title,
      meta_description,
      meta_keywords,
      status,
      scheduled_for,
      read_time,
    } = body;

    // Validation
    if (!title || !slug || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, slug, category' },
        { status: 400 }
      );
    }

    // Get user profile for author name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', user.id)
      .single();

    const authorName = profile?.display_name || profile?.full_name || 'Admin User';

    // Set published_at if status is 'published'
    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    // Insert article
    const { data: article, error } = await supabase
      .from('resource_articles')
      .insert({
        title,
        slug,
        description,
        content,
        category,
        tags,
        featured_image_url,
        meta_title,
        meta_description,
        meta_keywords,
        status: status || 'draft',
        published_at: publishedAt,
        scheduled_for,
        read_time,
        author_id: user.id,
        author_name: authorName,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating article:', error);
      return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
    }

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
