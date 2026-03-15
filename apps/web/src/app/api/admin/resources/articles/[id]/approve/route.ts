/**
 * POST /api/admin/resources/articles/[id]/approve
 * Approves a draft article. If scheduled_for is provided, sets status to 'scheduled'
 * and creates a scheduled_items row. If not provided or in the past, publishes immediately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const { id } = params;

    // Auth + admin check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json().catch(() => ({}));
    const scheduledFor: string | undefined = body.scheduled_for;

    // Load article
    const { data: article, error: fetchError } = await supabase
      .from('resource_articles')
      .select('id, status, title, slug')
      .eq('id', id)
      .single();

    if (fetchError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    if (article.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot approve article with status '${article.status}'. Must be 'draft'.` },
        { status: 400 }
      );
    }

    const now = new Date();
    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
    const publishNow = !scheduledDate || scheduledDate <= now;

    if (publishNow) {
      // Publish immediately
      const { error: updateError } = await supabase
        .from('resource_articles')
        .update({
          status: 'published',
          published_at: now.toISOString(),
          revision_feedback: null,
        })
        .eq('id', id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to publish article' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: 'published',
        published_at: now.toISOString(),
        article_id: article.id,
        slug: article.slug,
      });
    }

    // Schedule for future publication
    const { error: updateError } = await supabase
      .from('resource_articles')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledDate.toISOString(),
        revision_feedback: null,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to schedule article' },
        { status: 500 }
      );
    }

    // Create scheduled_items row for Scheduler calendar visibility
    const { error: scheduleError } = await supabase
      .from('scheduled_items')
      .insert({
        type: 'content',
        title: article.title,
        scheduled_at: scheduledDate.toISOString(),
        status: 'scheduled',
        metadata: {
          article_id: article.id,
          article_slug: article.slug,
        },
        created_by: user.id,
      });

    if (scheduleError) {
      console.error(
        '[Content Factory] Failed to create scheduled_items row:',
        scheduleError
      );
      // Non-fatal — article is still scheduled, just won't appear in Scheduler calendar
    }

    return NextResponse.json({
      status: 'scheduled',
      scheduled_for: scheduledDate.toISOString(),
      article_id: article.id,
      slug: article.slug,
    });
  } catch (error) {
    console.error('[Content Factory] Approve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
