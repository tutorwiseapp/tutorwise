/**
 * Filename: apps/web/src/app/api/admin/blog/articles/[id]/route.ts
 * Purpose: API routes for individual blog article operations (get, update, delete)
 * Created: 2026-01-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/blog/articles/[id]
 * Fetch a single blog article by ID or slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to fetch by ID first, then by slug
    let query = supabase.from('blog_articles').select('*');

    // Check if ID is a UUID or slug
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: article, error } = await query.single();

    if (error || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/blog/articles/[id]
 * Update a blog article
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

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

    // Build update object (only include fields that are provided)
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (featured_image_url !== undefined) updates.featured_image_url = featured_image_url;
    if (meta_title !== undefined) updates.meta_title = meta_title;
    if (meta_description !== undefined) updates.meta_description = meta_description;
    if (meta_keywords !== undefined) updates.meta_keywords = meta_keywords;
    if (scheduled_for !== undefined) updates.scheduled_for = scheduled_for;
    if (read_time !== undefined) updates.read_time = read_time;

    // Handle status changes
    if (status !== undefined) {
      updates.status = status;
      // Set published_at when changing to 'published'
      if (status === 'published') {
        const { data: currentArticle } = await supabase
          .from('blog_articles')
          .select('published_at')
          .eq('id', id)
          .single();

        // Only set published_at if not already set
        if (!currentArticle?.published_at) {
          updates.published_at = new Date().toISOString();
        }
      }
    }

    // Check if ID is a UUID or slug
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from('blog_articles').update(updates).select();

    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: article, error } = await query.single();

    if (error) {
      console.error('Error updating article:', error);
      return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }

    return NextResponse.json({ article }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/blog/articles/[id]
 * Delete a blog article
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if ID is a UUID or slug
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from('blog_articles').delete();

    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting article:', error);
      return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Article deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
