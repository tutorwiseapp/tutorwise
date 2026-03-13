/**
 * Filename: services/scheduler/src/executors/content.ts
 * Purpose: Publish resource articles or mark social posts as needing manual action
 */

import { query } from '../db.js';
import { logger } from '../logger.js';
import type { ScheduledItem, ExecutorResult } from '../types.js';

export async function executeContent(item: ScheduledItem): Promise<ExecutorResult> {
  const meta = item.metadata as Record<string, string>;
  const platform = meta.platform || 'resources';

  if (platform === 'resources') {
    return publishArticle(item, meta);
  }

  // LinkedIn, Twitter, Newsletter — mark as completed with manual note
  logger.info('content_manual', { id: item.id, platform });
  return {
    success: true,
    result: {
      platform,
      execution_note: `Manual post required on ${platform}`,
    },
  };
}

async function publishArticle(item: ScheduledItem, meta: Record<string, string>): Promise<ExecutorResult> {
  const slug = meta.article_slug;
  if (!slug) {
    throw new Error('No article_slug in metadata');
  }

  const result = await query(
    `UPDATE resource_articles
     SET status = 'published',
         published_at = COALESCE(published_at, now()),
         updated_at = now()
     WHERE slug = $1
       AND status != 'published'
     RETURNING id, slug, title`,
    [slug]
  );

  if (result.rowCount === 0) {
    // Already published or doesn't exist — not an error
    logger.warn('article_already_published_or_missing', { slug });
    return {
      success: true,
      result: { slug, note: 'Already published or not found' },
    };
  }

  const article = result.rows[0];
  logger.info('article_published', { slug: article.slug, title: article.title });

  return {
    success: true,
    result: { slug: article.slug, title: article.title, action: 'published' },
  };
}
