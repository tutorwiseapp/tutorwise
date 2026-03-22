/**
 * GET /api/virtualspace/workflows
 *
 * Returns published session_workflows, filterable by subject, level,
 * aiInvolvement, senFocus, examBoard, durationMax, tags, and free-text search.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');
  const level = searchParams.get('level');
  const aiInvolvement = searchParams.get('aiInvolvement');
  const senFocus = searchParams.get('senFocus');
  const examBoard = searchParams.get('examBoard');
  const durationMax = searchParams.get('durationMax');
  const search = searchParams.get('search');
  const tags = searchParams.get('tags'); // comma-separated
  const builtIn = searchParams.get('builtIn');

  let query = supabase
    .from('session_workflows')
    .select('id, slug, name, description, short_description, theme, tags, exam_board, subject, level, duration_mins, ai_involvement, sen_focus, phases, learn_your_way, built_in')
    .eq('published', true)
    .order('built_in', { ascending: false })
    .order('name');

  if (subject && subject !== 'any') query = query.eq('subject', subject);
  if (level && level !== 'any') query = query.eq('level', level);
  if (aiInvolvement) query = query.eq('ai_involvement', aiInvolvement);
  if (builtIn === 'true') query = query.eq('built_in', true);
  else if (builtIn === 'false') query = query.eq('built_in', false);
  if (senFocus === 'true') query = query.eq('sen_focus', true);
  if (examBoard && examBoard !== 'any') query = query.eq('exam_board', examBoard);
  if (durationMax) query = query.lte('duration_mins', parseInt(durationMax));
  if (tags) {
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagArray.length > 0) query = query.overlaps('tags', tagArray);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,short_description.ilike.%${search}%`);
  }

  const { data: workflows, error } = await query;
  if (error) {
    console.error('[workflows] fetch error:', error);
    return NextResponse.json({ error: 'Failed to load workflows' }, { status: 500 });
  }

  return NextResponse.json({ workflows: workflows || [] });
}

/**
 * POST /api/virtualspace/workflows
 * Create a custom workflow owned by the current user.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, description, short_description, subject, level, duration_mins, ai_involvement, sen_focus, exam_board, tags, theme, phases, learn_your_way } = body as Record<string, unknown>;

  if (!name || !subject || !level) {
    return NextResponse.json({ error: 'name, subject and level are required' }, { status: 400 });
  }

  const slug = `custom-${user.id.slice(0, 8)}-${Date.now()}`;

  const { data, error } = await supabase
    .from('session_workflows')
    .insert({
      slug,
      name,
      description: description ?? null,
      short_description: short_description ?? null,
      subject,
      level,
      duration_mins: duration_mins ?? 60,
      ai_involvement: ai_involvement ?? 'hints',
      sen_focus: sen_focus ?? false,
      exam_board: exam_board ?? 'any',
      tags: tags ?? [],
      theme: theme ?? { colour: '#6366f1', backgroundStyle: 'default', narrative: '', icon: '📚' },
      phases: phases ?? [],
      learn_your_way: learn_your_way ?? { freedoms: [], agencyPoints: [], bestFor: '' },
      built_in: false,
      published: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[workflows POST]', error);
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }

  return NextResponse.json({ workflow: data }, { status: 201 });
}
