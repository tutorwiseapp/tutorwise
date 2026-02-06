/**
 * Filename: apps/web/src/app/api/bookings/[id]/no-show/route.ts
 * Purpose: Report and handle no-show scenarios for bookings
 * Created: 2026-02-06
 *
 * Allows either party to report that the other party didn't show up for a confirmed session.
 *
 * No-show rules:
 * - Session must be in 'Confirmed' status
 * - Session start time must have passed
 * - Reporter must be a participant (client or tutor)
 * - Stores no-show report in session_artifacts
 * - Admin can review and take action (refund, dispute resolution)
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface NoShowReportBody {
  reported_party: 'client' | 'tutor'; // Who didn't show up
  reason?: string; // Optional reason/evidence
}

/**
 * POST /api/bookings/[id]/no-show
 * Report a no-show for this booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: bookingId } = await params;

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: NoShowReportBody = await request.json();
    const { reported_party, reason } = body;

    if (!reported_party || !['client', 'tutor'].includes(reported_party)) {
      return NextResponse.json(
        { error: 'reported_party must be either "client" or "tutor"' },
        { status: 400 }
      );
    }

    // 3. Get booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!client_id(id, full_name, email),
        tutor:profiles!tutor_id(id, full_name, email)
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 4. Verify user is a participant
    if (user.id !== booking.client_id && user.id !== booking.tutor_id) {
      return NextResponse.json(
        { error: 'You are not authorized to report no-show for this booking' },
        { status: 403 }
      );
    }

    // 5. Validate booking state
    if (booking.status !== 'Confirmed') {
      return NextResponse.json(
        { error: 'Can only report no-show for confirmed bookings' },
        { status: 400 }
      );
    }

    if (!booking.session_start_time) {
      return NextResponse.json(
        { error: 'Booking has no scheduled time' },
        { status: 400 }
      );
    }

    // 6. Check if session has started
    const sessionStart = new Date(booking.session_start_time);
    const now = new Date();

    if (sessionStart > now) {
      return NextResponse.json(
        { error: 'Cannot report no-show before session start time' },
        { status: 400 }
      );
    }

    // 7. Check if already reported
    const existingArtifacts = booking.session_artifacts || {};
    if (existingArtifacts.no_show_report) {
      return NextResponse.json(
        { error: 'No-show has already been reported for this booking' },
        { status: 400 }
      );
    }

    // 8. Store no-show report in session_artifacts
    const noShowReport = {
      reported_by: user.id,
      reported_party,
      reported_at: new Date().toISOString(),
      reason: reason || null,
      reporter_role: user.id === booking.client_id ? 'client' : 'tutor',
    };

    const updatedArtifacts = {
      ...existingArtifacts,
      no_show_report: noShowReport,
    };

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        session_artifacts: updatedArtifacts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[No-Show Report] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to report no-show' },
        { status: 500 }
      );
    }

    console.log(`[No-Show Report] ✅ No-show reported for booking ${bookingId} by ${user.id}`);

    // TODO: Trigger admin notification email for review
    // TODO: In Q2, implement automated dispute resolution workflow

    return NextResponse.json({
      success: true,
      message: 'No-show report submitted successfully. Admin team will review.',
      booking: {
        id: bookingId,
        no_show_report: noShowReport,
      },
    });
  } catch (error) {
    console.error('[No-Show Report] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
