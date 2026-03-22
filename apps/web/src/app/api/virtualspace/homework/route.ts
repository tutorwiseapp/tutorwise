/**
 * Homework API — user level (v1.0)
 *
 * GET /api/virtualspace/homework — list all homework for current user (student or tutor)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Return homework where user is student (pending) or tutor (all)
  const { data: homework } = await supabase
    .from('virtualspace_homework')
    .select(`
      id, text, due_date, practice_questions, completed_at, created_at,
      google_classroom_id,
      session:virtualspace_sessions(id, title),
      tutor:profiles!virtualspace_homework_tutor_id_fkey(full_name),
      student:profiles!virtualspace_homework_student_id_fkey(full_name)
    `)
    .or(`student_id.eq.${user.id},tutor_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ homework: homework || [] });
}
