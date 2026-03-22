/**
 * Breakout Rooms API (v1.0)
 *
 * POST /api/virtualspace/[sessionId]/breakout — create a breakout room
 * GET  /api/virtualspace/[sessionId]/breakout — list breakout rooms for this session
 * DELETE /api/virtualspace/[sessionId]/breakout?breakoutId=X — close a breakout room
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only session owner can create breakout rooms
  const { data: parent } = await supabase
    .from('virtualspace_sessions')
    .select('id, owner_id, status, title, session_type, booking_id')
    .eq('id', sessionId)
    .single();

  if (!parent) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (parent.owner_id !== user.id) return NextResponse.json({ error: 'Only the session owner can create breakout rooms' }, { status: 403 });
  if (parent.status !== 'active') return NextResponse.json({ error: 'Session is not active' }, { status: 400 });

  const { label } = await request.json().catch(() => ({}));

  // Count existing breakouts to auto-label
  const { count } = await supabase
    .from('virtualspace_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('parent_session_id', sessionId);

  const roomLabel = label || `Group ${String.fromCharCode(65 + (count || 0))}`; // "Group A", "Group B", …

  // Create the breakout session
  const { data: breakout, error } = await supabase
    .from('virtualspace_sessions')
    .insert({
      session_type: parent.session_type,
      booking_id: parent.booking_id,
      title: `${parent.title} — ${roomLabel}`,
      owner_id: user.id,
      status: 'active',
      max_participants: 10,
      parent_session_id: sessionId,
      breakout_label: roomLabel,
    })
    .select('id, title, breakout_label')
    .single();

  if (error || !breakout) {
    console.error('[breakout] Create error:', error);
    return NextResponse.json({ error: 'Failed to create breakout room' }, { status: 500 });
  }

  // Auto-join the owner
  await supabase
    .from('virtualspace_participants')
    .upsert({
      session_id: breakout.id,
      user_id: user.id,
      display_name: null,
      role: 'owner',
    });

  return NextResponse.json({
    success: true,
    breakout: {
      id: breakout.id,
      title: breakout.title,
      label: breakout.breakout_label,
      url: `/virtualspace/${breakout.id}`,
    },
  });
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: breakouts } = await supabase
    .from('virtualspace_sessions')
    .select('id, title, breakout_label, status, created_at')
    .eq('parent_session_id', sessionId)
    .order('created_at', { ascending: true });

  return NextResponse.json({ breakouts: breakouts || [] });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;
  const breakoutId = request.nextUrl.searchParams.get('breakoutId');
  if (!breakoutId) return NextResponse.json({ error: 'breakoutId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify parent ownership
  const { data: parent } = await supabase
    .from('virtualspace_sessions')
    .select('owner_id')
    .eq('id', sessionId)
    .single();

  if (!parent || parent.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase
    .from('virtualspace_sessions')
    .update({ status: 'completed' })
    .eq('id', breakoutId)
    .eq('parent_session_id', sessionId);

  return NextResponse.json({ success: true });
}
