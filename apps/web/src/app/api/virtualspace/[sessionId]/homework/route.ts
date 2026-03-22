/**
 * Homework API — per-session (v1.0)
 *
 * POST /api/virtualspace/[sessionId]/homework — save homework
 * GET  /api/virtualspace/[sessionId]/homework — list for this session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, dueDate } = await request.json();
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 });

  // Load session + booking to find student
  const { data: session } = await supabase
    .from('virtualspace_sessions')
    .select('id, owner_id, booking_id, session_type')
    .eq('id', sessionId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  let studentId = '';
  let bookingId: string | null = null;

  if (session.booking_id) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('tutor_id, client_id')
      .eq('id', session.booking_id)
      .single();

    if (booking) {
      // Verify tutor is the sender
      if (booking.tutor_id !== user.id) {
        return NextResponse.json({ error: 'Only the tutor can set homework' }, { status: 403 });
      }
      studentId = booking.client_id;
      bookingId = session.booking_id;
    }
  } else {
    // Standalone session — owner sets homework
    if (session.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the session owner can set homework' }, { status: 403 });
    }
    // Find a participant who is not the owner
    const { data: participants } = await supabase
      .from('virtualspace_participants')
      .select('user_id')
      .eq('session_id', sessionId)
      .neq('user_id', user.id)
      .limit(1);
    studentId = participants?.[0]?.user_id || user.id;
  }

  // Generate Sage practice questions (fire-and-forget in background)
  const generatePracticeQuestions = async () => {
    try {
      const ai = getAIService();
      const { data } = await ai.generateJSON<{ questions: Array<{ q: string; answer: string; hint: string }> }>({
        systemPrompt: 'You generate practice questions for students. Always return valid JSON.',
        userPrompt: `Generate 3 short practice questions for a student based on this homework assignment:

"${text}"

Return JSON: { "questions": [{ "q": "question text", "answer": "model answer", "hint": "one-sentence hint" }] }

Keep questions short, GCSE/A-Level style. Each question should reinforce the core concept.`,
      });
      return data.questions || [];
    } catch {
      return [];
    }
  };

  // Insert homework (practice questions generated async)
  const { data: hw, error } = await supabase
    .from('virtualspace_homework')
    .insert({
      session_id: sessionId,
      booking_id: bookingId,
      student_id: studentId,
      tutor_id: user.id,
      text: text.trim(),
      due_date: dueDate || null,
    })
    .select('id')
    .single();

  if (error || !hw) {
    console.error('[homework] Insert error:', error);
    return NextResponse.json({ error: 'Failed to save homework' }, { status: 500 });
  }

  // Generate + store practice questions in background
  generatePracticeQuestions().then(async (questions) => {
    if (questions.length) {
      await supabase
        .from('virtualspace_homework')
        .update({ practice_questions: questions })
        .eq('id', hw.id);
    }
  });

  return NextResponse.json({ success: true, id: hw.id });
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: homework } = await supabase
    .from('virtualspace_homework')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ homework: homework || [] });
}
