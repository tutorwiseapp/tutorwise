/**
 * POST /api/admin/scheduler/batch — bulk create scheduled items
 * Supports templates (e.g. linkedin-content-cycle) or raw arrays
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface ArticleInput {
  slug: string;
  file?: string;
  title?: string;
  color?: string;
}

interface BatchBody {
  template?: string;
  start_date?: string;
  articles?: ArticleInput[];
  items?: Array<{
    title: string;
    description?: string;
    type: string;
    scheduled_at: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    color?: string;
  }>;
}

function generateContentCycle(startDate: string, articles: ArticleInput[]): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];
  const start = new Date(startDate);

  const formats = [
    { offset: 0, format: 'full_post', label: 'Full LinkedIn post' },
    { offset: 6, format: 'carousel', label: 'Carousel' },
    { offset: 12, format: 'repost', label: 'Short-form repost' },
  ];

  articles.forEach((article, articleIndex) => {
    formats.forEach((fmt) => {
      const date = new Date(start);
      date.setDate(date.getDate() + (articleIndex * 2) + fmt.offset);

      items.push({
        title: `${fmt.label}: ${article.title || article.slug}`,
        type: 'content',
        scheduled_at: date.toISOString(),
        metadata: {
          platform: 'linkedin',
          format: fmt.format,
          article_slug: article.slug,
          article_file: article.file || null,
          image_color: article.color || null,
          cycle_id: `batch-${startDate}`,
          cycle_position: formats.indexOf(fmt) + 1,
        },
        tags: ['linkedin', 'gtm', article.slug],
        color: article.color || null,
      });
    });
  });

  return items;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json() as BatchBody;

    let itemsToInsert: Array<Record<string, unknown>> = [];

    if (body.template === 'linkedin-content-cycle') {
      if (!body.start_date || !body.articles?.length) {
        return NextResponse.json({ error: 'start_date and articles are required for linkedin-content-cycle template' }, { status: 400 });
      }
      itemsToInsert = generateContentCycle(body.start_date, body.articles);
    } else if (body.items?.length) {
      itemsToInsert = body.items;
    } else {
      return NextResponse.json({ error: 'Provide a template or items array' }, { status: 400 });
    }

    // Add created_by to all items
    const rows = itemsToInsert.map((item) => ({
      ...item,
      created_by: user.id,
    }));

    const { data, error } = await supabase
      .from('scheduled_items')
      .insert(rows)
      .select('id, title, type, scheduled_at');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data, count: data?.length ?? 0 }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
