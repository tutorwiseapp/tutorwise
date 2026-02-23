/**
 * Filename: api/ai-tutors/sessions/[sessionId]/route.ts
 * Purpose: Get AI tutor session details
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/ai-tutors/sessions/[sessionId]
 * Get session details and transcript
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session
    const { data: session, error } = await supabase
      .from('ai_tutor_sessions')
      .select(
        `
        *,
        ai_tutors (
          id,
          owner_id,
          display_name,
          subject,
          avatar_url
        )
      `
      )
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is session owner or AI tutor owner
    if (
      session.client_id !== user.id &&
      session.ai_tutors.owner_id !== user.id
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error('Error fetching AI tutor session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
