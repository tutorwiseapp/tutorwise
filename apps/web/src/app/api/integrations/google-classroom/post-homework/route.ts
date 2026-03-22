/**
 * Google Classroom — Post Homework (v1.0)
 *
 * POST /api/integrations/google-classroom/post-homework
 * Creates a Google Classroom assignment from a VirtualSpace homework record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { homeworkId, courseId } = await request.json();
  if (!homeworkId || !courseId) {
    return NextResponse.json({ error: 'homeworkId and courseId required' }, { status: 400 });
  }

  // Load homework
  const { data: hw } = await supabase
    .from('virtualspace_homework')
    .select('*')
    .eq('id', homeworkId)
    .eq('tutor_id', user.id)
    .single();

  if (!hw) return NextResponse.json({ error: 'Homework not found' }, { status: 404 });

  // Load integration
  const { data: integration } = await supabase
    .from('tutor_integrations')
    .select('access_token')
    .eq('tutor_id', user.id)
    .eq('provider', 'google_classroom')
    .single();

  if (!integration) {
    return NextResponse.json({ error: 'Google Classroom not connected' }, { status: 400 });
  }

  // Build due date
  let dueDate: Record<string, number> | undefined;
  if (hw.due_date) {
    const d = new Date(hw.due_date);
    dueDate = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

  try {
    const body: any = {
      title: hw.text.length > 60 ? hw.text.slice(0, 57) + '…' : hw.text,
      description: hw.text,
      workType: 'ASSIGNMENT',
      state: 'PUBLISHED',
    };
    if (dueDate) body.dueDate = dueDate;

    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Classroom API error' }, { status: 500 });
    }

    // Store the Classroom assignment ID
    await supabase
      .from('virtualspace_homework')
      .update({ google_classroom_id: data.id })
      .eq('id', homeworkId);

    return NextResponse.json({ success: true, classroomId: data.id });
  } catch (err: any) {
    console.error('[post-homework] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
