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

  let query = supabase
    .from('session_workflows')
    .select('id, slug, name, description, short_description, theme, tags, exam_board, subject, level, duration_mins, ai_involvement, sen_focus, phases, learn_your_way, built_in')
    .eq('published', true)
    .order('built_in', { ascending: false })
    .order('name');

  if (subject && subject !== 'any') query = query.eq('subject', subject);
  if (level && level !== 'any') query = query.eq('level', level);
  if (aiInvolvement) query = query.eq('ai_involvement', aiInvolvement);
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
