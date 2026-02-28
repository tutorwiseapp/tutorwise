/**
 * Filename: api/ai-agents/sessions/[sessionId]/join-video/route.ts
 * Purpose: Start VirtualSpace video session with AI tutor
 * Created: 2026-02-24
 * Phase: 3B - VirtualSpace Integration
 *
 * Enables clients to upgrade their AI tutor chat session to a video session.
 * Creates a VirtualSpace session and links it to the AI tutor session.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface JoinVideoRequest {
  session_title?: string; // Optional custom title for VirtualSpace session
}

/**
 * POST /api/ai-agents/sessions/[sessionId]/join-video
 * Upgrade AI tutor session to video mode
 *
 * Body: { session_title?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createClient();
  const { sessionId } = await params;

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: JoinVideoRequest = await request.json();
    const { session_title } = body;

    // 3. Fetch AI tutor session
    const { data: aiSession, error: sessionError } = await supabase
      .from('ai_agent_sessions')
      .select(`
        *,
        ai_agent:ai_agents!agent_id(
          id,
          name,
          owner_id
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !aiSession) {
      return NextResponse.json({ error: 'AI tutor session not found' }, { status: 404 });
    }

    // 4. Verify authorization (must be the client)
    if (user.id !== aiSession.client_id) {
      return NextResponse.json(
        { error: 'Only the session client can start video mode' },
        { status: 403 }
      );
    }

    // 5. Check if session is active
    if (aiSession.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot start video for ${aiSession.status} session` },
        { status: 400 }
      );
    }

    // 6. Check if already in video mode
    if (aiSession.virtualspace_session_id) {
      return NextResponse.json(
        {
          error: 'Session is already in video mode',
          virtualspace_session_id: aiSession.virtualspace_session_id,
          join_url: `/virtualspace/${aiSession.virtualspace_session_id}`
        },
        { status: 400 }
      );
    }

    // 7. Create VirtualSpace session
    const aiTutor = (aiSession.ai_agent as any);
    const vsTitle = session_title || `AI Tutor: ${aiTutor?.name || 'Session'}`;

    const { data: vsSession, error: vsError } = await supabase
      .from('virtualspace_sessions')
      .insert({
        title: vsTitle,
        host_id: user.id,
        session_type: 'ai_agent',
        status: 'active',
        metadata: {
          session_id: sessionId,
          agent_id: aiSession.agent_id,
          agent_name: aiTutor?.name
        }
      })
      .select()
      .single();

    if (vsError) {
      console.error('[Join Video] Failed to create VirtualSpace session:', vsError);
      throw vsError;
    }

    // 8. Link VirtualSpace session to AI tutor session
    const { error: updateError } = await supabase
      .from('ai_agent_sessions')
      .update({
        virtualspace_session_id: vsSession.id,
        session_mode: 'video',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[Join Video] Failed to link VirtualSpace session:', updateError);
      // Try to clean up VirtualSpace session
      await supabase
        .from('virtualspace_sessions')
        .delete()
        .eq('id', vsSession.id);
      throw updateError;
    }

    // 9. Log event
    await supabase
      .from('ai_agent_virtualspace_events')
      .insert({
        session_id: sessionId,
        virtualspace_session_id: vsSession.id,
        event_type: 'ai_joined',
        event_data: {
          timestamp: new Date().toISOString(),
          client_id: user.id
        }
      });

    console.log('[Join Video] Video session created:', {
      aiSessionId: sessionId,
      virtualspaceSessionId: vsSession.id,
      clientId: user.id
    });

    return NextResponse.json({
      success: true,
      virtualspace_session_id: vsSession.id,
      join_url: `/virtualspace/${vsSession.id}`,
      session_title: vsTitle,
      message: 'Video session started successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[Join Video] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
