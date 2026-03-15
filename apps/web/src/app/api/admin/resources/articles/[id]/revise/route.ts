/**
 * POST /api/admin/resources/articles/[id]/revise
 * Triggers a Content Team revision run with specific feedback.
 * Sets article status to 'revising' and triggers the content-team pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const REVISION_TYPES = [
  'friendlier_tone',
  'more_professional',
  'shorter',
  'more_depth',
  'better_seo',
  'custom',
] as const;

const REVISION_INSTRUCTIONS: Record<string, string> = {
  friendlier_tone:
    'Rewrite with a warmer, more conversational tone. Use shorter sentences, personal pronouns, and relatable examples.',
  more_professional:
    'Rewrite with a more formal, authoritative tone. Use industry terminology, cite sources, and maintain an expert voice.',
  shorter:
    'Condense to approximately 60% of current length. Keep the core argument and key points. Remove filler and redundancy.',
  more_depth:
    'Expand with more detail, concrete examples, data points, and supporting evidence. Add subsections where appropriate.',
  better_seo:
    'Improve keyword placement in headings, opening paragraph, and meta description. Add internal links. Optimise heading hierarchy.',
};

const MAX_REVISIONS = 3;

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
    const body = await request.json();
    const types: string[] = body.types || [];
    const custom: string | undefined = body.custom;

    // Validate revision types
    for (const t of types) {
      if (!REVISION_TYPES.includes(t as (typeof REVISION_TYPES)[number])) {
        return NextResponse.json(
          { error: `Invalid revision type: ${t}` },
          { status: 400 }
        );
      }
    }
    if (types.length === 0 && !custom) {
      return NextResponse.json(
        { error: 'At least one revision type or custom feedback is required' },
        { status: 400 }
      );
    }

    // Load article
    const { data: article, error: fetchError } = await supabase
      .from('resource_articles')
      .select('id, status, revision_count, title, slug, content, category, tags, meta_title, meta_description, read_time')
      .eq('id', id)
      .single();

    if (fetchError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    if (article.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot revise article with status '${article.status}'. Must be 'draft'.` },
        { status: 400 }
      );
    }
    if ((article.revision_count ?? 0) >= MAX_REVISIONS) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_REVISIONS} revision rounds reached. Edit the article directly or approve as-is.`,
          revision_count: article.revision_count,
        },
        { status: 400 }
      );
    }

    // Build revision feedback
    const revisionFeedback = {
      types,
      custom: custom || null,
      instructions: types
        .filter((t) => t !== 'custom')
        .map((t) => REVISION_INSTRUCTIONS[t])
        .filter(Boolean),
    };

    // Set status to 'revising' and store feedback
    const { error: updateError } = await supabase
      .from('resource_articles')
      .update({
        status: 'revising',
        revision_feedback: revisionFeedback,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update article status' },
        { status: 500 }
      );
    }

    // Build task input for Content Team revision run
    const revisionInstructions = [
      ...revisionFeedback.instructions,
      ...(custom ? [`Custom feedback: ${custom}`] : []),
    ].join('\n\n');

    const taskInput = JSON.stringify({
      task_type: 'revision',
      article_id: article.id,
      article_slug: article.slug,
      original_content: article.content,
      original_title: article.title,
      original_category: article.category,
      original_tags: article.tags,
      original_meta_title: article.meta_title,
      original_meta_description: article.meta_description,
      revision_types: types,
      revision_instructions: revisionInstructions,
      revision_round: (article.revision_count ?? 0) + 1,
    });

    // Trigger Content Team run (fire-and-forget)
    // The TeamRuntime will handle the pipeline execution asynchronously
    try {
      const { teamRuntime } = await import(
        '@/lib/workflow/team-runtime/TeamRuntime'
      );
      // Fire-and-forget — don't await the full run
      teamRuntime
        .run('content-team', taskInput, 'revision_request')
        .catch((err: unknown) =>
          console.error('[Content Factory] Revision run failed:', err)
        );
    } catch (err) {
      console.error('[Content Factory] Failed to trigger revision run:', err);
      // Revert status on trigger failure
      await supabase
        .from('resource_articles')
        .update({ status: 'draft', revision_feedback: null })
        .eq('id', id);
      return NextResponse.json(
        { error: 'Failed to trigger revision run' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'revising',
      revision_count: (article.revision_count ?? 0) + 1,
      max_revisions: MAX_REVISIONS,
      feedback: revisionFeedback,
    });
  } catch (error) {
    console.error('[Content Factory] Revise error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
