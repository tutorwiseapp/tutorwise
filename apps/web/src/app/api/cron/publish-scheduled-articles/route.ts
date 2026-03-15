/**
 * POST /api/cron/publish-scheduled-articles
 * Auto-publishes articles that have reached their scheduled_for time.
 * Also marks corresponding scheduled_items as completed and creates scheduler_runs records.
 *
 * Note: pg_cron also runs the core UPDATE directly in SQL (migration 406) as a safety net.
 * This route adds the scheduler_runs audit trail and scheduled_items completion.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Auth: cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    const xCronSecret = request.headers.get('x-cron-secret');
    const token = auth?.replace('Bearer ', '');
    if (token !== cronSecret && xCronSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = await createServiceRoleClient();
    const now = new Date().toISOString();

    // Find articles ready to publish
    const { data: articles, error: fetchError } = await supabase
      .from('resource_articles')
      .select('id, title, slug')
      .eq('status', 'scheduled')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now);

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to query articles' },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ published: 0 });
    }

    const results: { article_id: string; slug: string; success: boolean; error?: string }[] = [];

    for (const article of articles) {
      const startedAt = new Date();
      try {
        // Publish the article
        const { error: pubError } = await supabase
          .from('resource_articles')
          .update({
            status: 'published',
            published_at: now,
          })
          .eq('id', article.id)
          .eq('status', 'scheduled'); // Idempotency guard

        if (pubError) throw pubError;

        // Mark scheduled_items as completed
        await supabase
          .from('scheduled_items')
          .update({
            status: 'completed',
            completed_at: now,
          })
          .eq('type', 'content')
          .eq('status', 'scheduled')
          .contains('metadata', { article_id: article.id });

        // Create scheduler_runs record
        const completedAt = new Date();
        await supabase.from('scheduler_runs').insert({
          item_id: null, // We don't have the scheduled_items ID easily; null is acceptable
          status: 'completed',
          started_at: startedAt.toISOString(),
          completed_at: completedAt.toISOString(),
          duration_ms: completedAt.getTime() - startedAt.getTime(),
          result: { article_id: article.id, slug: article.slug, action: 'auto_publish' },
        });

        results.push({ article_id: article.id, slug: article.slug, success: true });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Auto-publish] Failed for ${article.slug}:`, errMsg);
        results.push({ article_id: article.id, slug: article.slug, success: false, error: errMsg });

        // Log failure in scheduler_runs
        const completedAt = new Date();
        await supabase.from('scheduler_runs').insert({
          item_id: null,
          status: 'failed',
          started_at: startedAt.toISOString(),
          completed_at: completedAt.toISOString(),
          duration_ms: completedAt.getTime() - startedAt.getTime(),
          error: errMsg,
          result: { article_id: article.id, slug: article.slug, action: 'auto_publish' },
        });
      }
    }

    return NextResponse.json({
      published: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('[Auto-publish] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
