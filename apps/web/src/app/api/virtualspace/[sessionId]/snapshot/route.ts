/**
 * Save VirtualSpace Snapshot API (v5.9)
 *
 * @path POST /api/virtualspace/[sessionId]/snapshot
 * @description Saves a whiteboard snapshot for the session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const sessionId = params.sessionId;

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { snapshotData } = body;

    if (!snapshotData || typeof snapshotData !== 'string') {
      return NextResponse.json(
        { error: 'Invalid snapshot data' },
        { status: 400 }
      );
    }

    // 3. Fetch session to validate access
    const { data: session, error: fetchError } = await supabase
      .from('virtualspace_sessions')
      .select('id, session_type, booking_id, owner_id')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 4. Validate user is participant
    const { data: participant } = await supabase
      .from('virtualspace_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    // Also check if owner or booking participant
    let hasAccess = session.owner_id === user.id || !!participant;

    if (!hasAccess && session.booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('tutor_id, student_id')
        .eq('id', session.booking_id)
        .single();

      hasAccess = booking?.tutor_id === user.id || booking?.student_id === user.id;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 5. Determine storage bucket based on session type
    const bucket =
      session.session_type === 'booking'
        ? 'booking-artifacts'
        : 'virtualspace-artifacts';

    const fileName =
      session.session_type === 'booking' && session.booking_id
        ? `${session.booking_id}-${Date.now()}.json`
        : `${sessionId}/${Date.now()}.json`;

    // 6. Upload snapshot to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, snapshotData, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload snapshot' },
        { status: 500 }
      );
    }

    // 7. Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    const savedAt = new Date().toISOString();

    // 8. Update artifacts based on session type
    if (session.session_type === 'booking' && session.booking_id) {
      // Update booking.session_artifacts for booking sessions
      await supabase
        .from('bookings')
        .update({
          session_artifacts: {
            whiteboard_snapshot_url: publicUrl,
            saved_at: savedAt,
          },
          updated_at: savedAt,
        })
        .eq('id', session.booking_id);
    }

    // Always update the virtualspace session artifacts
    const { data: currentSession } = await supabase
      .from('virtualspace_sessions')
      .select('artifacts')
      .eq('id', sessionId)
      .single();

    await supabase
      .from('virtualspace_sessions')
      .update({
        artifacts: {
          ...(currentSession?.artifacts || {}),
          whiteboard_snapshot_url: publicUrl,
          saved_at: savedAt,
        },
        last_activity_at: savedAt,
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      snapshotUrl: publicUrl,
      savedAt,
    });
  } catch (error) {
    console.error('Save snapshot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
