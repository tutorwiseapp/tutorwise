/**
 * POST /api/sage/virtualspace/canvas-event
 *
 * Fire-and-forget logging endpoint for canvas events within a Sage VirtualSpace session.
 * Records stamps, observations, and profile transitions to sage_canvas_events.
 *
 * Called client-side with no await — failures are silently swallowed.
 *
 * @module api/sage/virtualspace/canvas-event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      sageSessionId,
      virtualspaceSessionId,
      eventType,
      shapeType,
      shapeData,
      observationTrigger,
      observationFeedback,
      fromProfile,
      toProfile,
    } = body as {
      sageSessionId?: string;
      virtualspaceSessionId?: string;
      eventType?: string;
      shapeType?: string;
      shapeData?: Record<string, unknown>;
      observationTrigger?: string;
      observationFeedback?: string;
      fromProfile?: string;
      toProfile?: string;
    };

    if (!sageSessionId || !virtualspaceSessionId || !eventType) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Verify ownership (sage_session belongs to this user)
    const { data: session } = await supabase
      .from('sage_sessions')
      .select('user_id')
      .eq('id', sageSessionId)
      .single();

    if (!session || session.user_id !== user.id) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    // Use service role for the insert — ownership already verified above.
    // The RLS policy required admin access (C1 audit finding); service role bypasses it safely.
    const adminDb = createServiceRoleClient();
    await adminDb.from('sage_canvas_events').insert({
      sage_session_id:          sageSessionId,
      virtualspace_session_id:  virtualspaceSessionId,
      event_type:               eventType,
      shape_type:               shapeType ?? null,
      shape_data:               shapeData ?? null,
      observation_trigger:      observationTrigger ?? null,
      observation_feedback:     observationFeedback ?? null,
      from_profile:             fromProfile ?? null,
      to_profile:               toProfile ?? null,
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[Sage Canvas Event] Error:', error);
    // Always return 200 — this is a fire-and-forget logging endpoint
    return NextResponse.json({ ok: false });
  }
}
