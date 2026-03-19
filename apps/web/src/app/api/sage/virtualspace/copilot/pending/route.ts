/**
 * GET /api/sage/virtualspace/copilot/pending?sessionId=...&sageSessionId=...
 *
 * Returns unactioned co-pilot suggestions from the last 5 minutes.
 * Called on tutor reconnect to replay missed whispers in the overlay.
 * Whispers older than 5 minutes are discarded as no longer contextually relevant.
 *
 * @module api/sage/virtualspace/copilot/pending
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId     = searchParams.get('sessionId');
    const sageSessionId = searchParams.get('sageSessionId');

    if (!sessionId || !sageSessionId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // Verify ownership
    const { data: sageSession } = await supabase
      .from('sage_sessions')
      .select('user_id')
      .eq('id', sageSessionId)
      .single();

    if (!sageSession || sageSession.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Fetch copilot_suggestion events from last 5 minutes
    const { data: suggestions } = await supabase
      .from('sage_canvas_events')
      .select('id, shape_data, created_at')
      .eq('sage_session_id', sageSessionId)
      .eq('virtualspace_session_id', sessionId)
      .eq('event_type', 'copilot_suggestion')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: true });

    if (!suggestions?.length) {
      return NextResponse.json({ whispers: [] });
    }

    // Fetch accepted/dismissed event IDs to exclude already-actioned suggestions
    const { data: actioned } = await supabase
      .from('sage_canvas_events')
      .select('shape_data')
      .eq('sage_session_id', sageSessionId)
      .eq('virtualspace_session_id', sessionId)
      .in('event_type', ['copilot_accepted', 'copilot_dismissed'])
      .gte('created_at', fiveMinutesAgo);

    const actionedIds = new Set<string>(
      (actioned ?? [])
        .map(e => (e.shape_data as Record<string, unknown>)?.whisperId as string)
        .filter(Boolean)
    );

    const pending = suggestions
      .map(s => (s.shape_data as Record<string, unknown>))
      .filter(w => w && !actionedIds.has(w.id as string));

    return NextResponse.json({ whispers: pending });

  } catch (error) {
    console.error('[Sage Copilot Pending] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
