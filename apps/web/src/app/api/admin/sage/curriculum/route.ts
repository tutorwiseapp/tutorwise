/**
 * Sage Curriculum Registry API
 *
 * GET /api/admin/sage/curriculum?subject=&level=&search=&page=&limit=
 *
 * Returns curriculum topics from sage_curriculum_topics with joined exam boards.
 *
 * @module api/admin/sage/curriculum
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const level = searchParams.get('level');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortKey = searchParams.get('sort') || 'sort_order';
    const sortDir = searchParams.get('dir') === 'desc' ? false : true;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('sage_curriculum_topics')
      .select('*', { count: 'exact' });

    if (subject) {
      query = query.eq('subject', subject);
    }
    if (level) {
      query = query.eq('level', level);
    }
    if (search) {
      query = query.or(`topic_name.ilike.%${search}%,topic_slug.ilike.%${search}%`);
    }

    query = query.order(sortKey, { ascending: sortDir });
    query = query.range(offset, offset + limit - 1);

    const { data: topics, count, error: topicsError } = await query;

    if (topicsError) {
      return NextResponse.json({ error: topicsError.message }, { status: 500 });
    }

    // Fetch exam boards for these topics
    const topicIds = (topics || []).map((t: { id: string }) => t.id);
    let boards: { topic_id: string; exam_board: string; paper: number | null; weighting_percent: number | null }[] = [];

    if (topicIds.length > 0) {
      const { data: boardData } = await supabase
        .from('sage_curriculum_boards')
        .select('topic_id, exam_board, paper, weighting_percent')
        .in('topic_id', topicIds);
      boards = boardData || [];
    }

    // Fetch distinct subjects and levels for filter options
    const [subjectsRes, levelsRes] = await Promise.all([
      supabase.from('sage_curriculum_topics').select('subject').limit(1000),
      supabase.from('sage_curriculum_topics').select('level').limit(1000),
    ]);

    const uniqueSubjects = [...new Set((subjectsRes.data || []).map((r: { subject: string }) => r.subject))].sort();
    const uniqueLevels = [...new Set((levelsRes.data || []).map((r: { level: string }) => r.level))].sort();

    // Merge boards onto topics
    const boardsByTopic = new Map<string, typeof boards>();
    for (const b of boards) {
      const existing = boardsByTopic.get(b.topic_id) || [];
      existing.push(b);
      boardsByTopic.set(b.topic_id, existing);
    }

    const enrichedTopics = (topics || []).map((t: Record<string, unknown>) => ({
      ...t,
      exam_boards: boardsByTopic.get(t.id as string) || [],
    }));

    return NextResponse.json({
      topics: enrichedTopics,
      total: count || 0,
      page,
      limit,
      filters: {
        subjects: uniqueSubjects,
        levels: uniqueLevels,
      },
    });
  } catch (err) {
    console.error('[sage/curriculum] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
