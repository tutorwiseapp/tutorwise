/**
 * Homework Item API — mark complete (v1.0)
 *
 * PATCH /api/virtualspace/homework/[id] — mark homework as complete (student only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('virtualspace_homework')
    .update({ completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('student_id', user.id); // student can only complete their own

  if (error) {
    return NextResponse.json({ error: 'Failed to mark complete' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
