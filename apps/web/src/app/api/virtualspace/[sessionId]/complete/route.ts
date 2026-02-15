/**
 * Complete VirtualSpace Session API (v5.9)
 *
 * @path POST /api/virtualspace/[sessionId]/complete
 * @description Marks a session as complete. For booking sessions, also updates booking status and triggers CaaS.
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

    // 2. Fetch session with booking
    const { data: session, error: fetchError } = await supabase
      .from('virtualspace_sessions')
      .select(
        `
        id,
        session_type,
        booking_id,
        owner_id,
        status,
        booking:booking_id (
          id,
          tutor_id,
          student_id,
          status
        )
      `
      )
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 3. For booking sessions, only tutor can mark complete
    if (session.session_type === 'booking') {
      // Handle Supabase embedding which can return array or single object
      const bookingData = session.booking;
      const booking = Array.isArray(bookingData)
        ? (bookingData[0] as { tutor_id: string; student_id: string } | undefined)
        : (bookingData as { tutor_id: string; student_id: string } | null);
      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found for this session' },
          { status: 404 }
        );
      }

      if (booking.tutor_id !== user.id) {
        return NextResponse.json(
          { error: 'Only the tutor can mark a booking session as complete' },
          { status: 403 }
        );
      }

      // Update booking status to trigger CaaS
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'Completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.booking_id);

      if (bookingUpdateError) {
        console.error('Error updating booking status:', bookingUpdateError);
        return NextResponse.json(
          { error: 'Failed to complete booking' },
          { status: 500 }
        );
      }
    } else {
      // For standalone/free_help, only owner can complete
      if (session.owner_id !== user.id) {
        return NextResponse.json(
          { error: 'Only the session owner can mark it as complete' },
          { status: 403 }
        );
      }
    }

    // 4. Update session status
    const { error: sessionUpdateError } = await supabase
      .from('virtualspace_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (sessionUpdateError) {
      console.error('Error updating session status:', sessionUpdateError);
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 }
      );
    }

    // Note: For booking sessions, CaaS recalculation happens automatically
    // via database trigger (trigger_caas_immediate_on_booking_complete)

    return NextResponse.json({
      success: true,
      message: 'Session marked as complete',
      triggersCaaS: session.session_type === 'booking',
    });
  } catch (error) {
    console.error('Complete session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
