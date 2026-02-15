/**
 * List VirtualSpace Sessions API (v5.9)
 *
 * @path GET /api/virtualspace/sessions
 * @description Lists all sessions the current user owns or participates in
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { VirtualSpaceSessionListItem } from '@/lib/virtualspace';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'active' | 'completed' | 'expired' | null (all)
    const mode = searchParams.get('mode'); // 'standalone' | 'booking' | 'free_help' | null (all)

    // 3. Get sessions where user is a participant
    const { data: participantSessions } = await supabase
      .from('virtualspace_participants')
      .select('session_id')
      .eq('user_id', user.id)
      .is('left_at', null);

    const participantSessionIds = participantSessions?.map((p) => p.session_id) || [];

    // 4. Build query for sessions where user is owner or participant
    let query = supabase
      .from('virtualspace_sessions')
      .select(
        `
        id,
        title,
        session_type,
        status,
        owner_id,
        created_at,
        last_activity_at
      `
      )
      .or(`owner_id.eq.${user.id}${participantSessionIds.length > 0 ? `,id.in.(${participantSessionIds.join(',')})` : ''}`)
      .order('last_activity_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (mode) {
      query = query.eq('session_type', mode);
    }

    const { data: sessions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Fetch sessions error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    // 5. Get participant counts for each session
    const sessionIds = sessions?.map((s) => s.id) || [];
    const { data: participantCounts } = await supabase
      .from('virtualspace_participants')
      .select('session_id')
      .in('session_id', sessionIds)
      .is('left_at', null);

    const countMap = new Map<string, number>();
    participantCounts?.forEach((p) => {
      const count = countMap.get(p.session_id) || 0;
      countMap.set(p.session_id, count + 1);
    });

    // 6. Map to response format
    const sessionList: VirtualSpaceSessionListItem[] =
      sessions?.map((session) => ({
        id: session.id,
        title: session.title,
        mode: session.session_type,
        status: session.status,
        participantCount: countMap.get(session.id) || 1,
        createdAt: session.created_at,
        lastActivityAt: session.last_activity_at,
        isOwner: session.owner_id === user.id,
      })) || [];

    return NextResponse.json({
      success: true,
      sessions: sessionList,
    });
  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
