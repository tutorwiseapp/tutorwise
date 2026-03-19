/**
 * POST /api/sage/virtualspace/copilot/accept
 *
 * Tutor accepts a Sage co-pilot suggestion.
 * Logs copilot_accepted to sage_canvas_events.
 * Returns the shape spec so the client can stamp it with tutor attribution
 * (no Sage branding — tutor owns it on the canvas).
 *
 * @module api/sage/virtualspace/copilot/accept
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { sageSessionId, sessionId, whisperId, shape } = body as {
      sageSessionId?: string;
      sessionId?: string;
      whisperId?: string;
      shape?: { type: string; props?: Record<string, unknown> };
    };

    if (!sageSessionId || !sessionId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
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

    // Log accepted event (service role — C1 fix)
    const adminDb = createServiceRoleClient();
    await adminDb.from('sage_canvas_events').insert({
      sage_session_id:          sageSessionId,
      virtualspace_session_id:  sessionId,
      event_type:               'copilot_accepted',
      shape_type:               shape?.type ?? null,
      shape_data:               shape ? { whisperId, shape } : null,
    });

    return NextResponse.json({ ok: true, shape });

  } catch (error) {
    console.error('[Sage Copilot Accept] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
