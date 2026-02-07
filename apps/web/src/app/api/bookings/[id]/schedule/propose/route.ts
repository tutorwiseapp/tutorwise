/**
 * Filename: apps/web/src/app/api/bookings/[id]/schedule/propose/route.ts
 * Purpose: Propose a session time for a booking (Stage 3: SCHEDULE)
 * Created: 2026-02-05
 *
 * Part of the 5-stage booking workflow: Discover > Book > SCHEDULE > Pay > Review
 *
 * This endpoint allows either the client or tutor to propose a session time.
 * The other party must then confirm the proposed time.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  validateProposedTime,
  getSlotReservationExpiry,
  DEFAULT_SCHEDULING_RULES,
} from '@/lib/scheduling/rules';
import { sendTimeProposedEmail, type SchedulingEmailData } from '@/lib/email-templates/booking';
import { checkAllConflicts } from '@/lib/scheduling/conflict-detection';

export const dynamic = 'force-dynamic';

interface ProposeBody {
  proposed_date: string; // ISO timestamp
}

/**
 * POST /api/bookings/[id]/schedule/propose
 * Propose a session time for the booking
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
    const body: ProposeBody = await request.json();
    const { proposed_date } = body;

    if (!proposed_date) {
      return NextResponse.json(
        { error: 'proposed_date is required' },
        { status: 400 }
      );
    }

    const proposedTime = new Date(proposed_date);
    if (isNaN(proposedTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // 3. Get booking and verify user is a participant (include profiles for email)
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

    // 4. Rate limiting: Check proposal attempts
    const artifacts = booking.session_artifacts || {};
    const proposalHistory = artifacts.proposal_history || [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count proposals in last 24 hours by this user
    const recentProposals = proposalHistory.filter((p: any) =>
      p.proposed_by === user.id && new Date(p.proposed_at) > oneDayAgo
    );

    const MAX_PROPOSALS_PER_DAY = 5;
    if (recentProposals.length >= MAX_PROPOSALS_PER_DAY) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Maximum ${MAX_PROPOSALS_PER_DAY} proposals per day allowed.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: Math.ceil((recentProposals[0].proposed_at.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 1000)
        },
        { status: 429 }
      );
    }

    // Verify user is either client or tutor
    if (user.id !== booking.client_id && user.id !== booking.tutor_id) {
      return NextResponse.json(
        { error: 'You are not authorized to schedule this booking' },
        { status: 403 }
      );
    }

    // 4. Validate booking state
    if (booking.status !== 'Pending') {
      return NextResponse.json(
        { error: 'Only pending bookings can be scheduled' },
        { status: 400 }
      );
    }

    // 5. Validate proposed time against scheduling rules
    const validation = validateProposedTime(proposedTime, DEFAULT_SCHEDULING_RULES);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason, code: validation.code },
        { status: 400 }
      );
    }

    // 6. Check for conflicts with existing bookings and availability exceptions
    try {
      const conflictCheck = await checkAllConflicts(
        booking.tutor_id,
        proposedTime,
        booking.session_duration,
        {
          excludeBookingId: bookingId,
          schedulingStatuses: ['proposed', 'scheduled'],
        }
      );

      if (conflictCheck.hasConflict) {
        return NextResponse.json(
          {
            error: conflictCheck.message || 'This time slot is no longer available. Please select a different time.',
            code: 'TIME_SLOT_CONFLICT'
          },
          { status: 409 }
        );
      }
    } catch (conflictError) {
      console.error('[Schedule Propose] Conflict check error:', conflictError);
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    // 7. Calculate slot reservation expiry (15 minutes)
    const slotReservedUntil = getSlotReservationExpiry(DEFAULT_SCHEDULING_RULES);

    // 8. Update booking with proposed time
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        session_start_time: proposedTime.toISOString(),
        scheduling_status: 'proposed',
        proposed_by: user.id,
        proposed_at: new Date().toISOString(),
        slot_reserved_until: slotReservedUntil.toISOString(),
        // Clear any previous confirmation
        schedule_confirmed_by: null,
        schedule_confirmed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[Schedule Propose] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to propose time' },
        { status: 500 }
      );
    }

    // 9. Send notification email to other party
    const isProposedByTutor = user.id === booking.tutor_id;
    const proposerName = isProposedByTutor ? booking.tutor?.full_name : booking.client?.full_name;

    if (booking.client?.email && booking.tutor?.email) {
      const emailData: SchedulingEmailData = {
        bookingId: booking.id,
        serviceName: booking.service_name,
        proposedTime,
        sessionDuration: booking.session_duration,
        amount: booking.amount,
        subjects: booking.subjects,
        deliveryMode: booking.delivery_mode,
        locationCity: booking.location_city,
        tutorName: booking.tutor.full_name || 'Tutor',
        tutorEmail: booking.tutor.email,
        clientName: booking.client.full_name || 'Client',
        clientEmail: booking.client.email,
        proposedByName: proposerName || (isProposedByTutor ? 'Your tutor' : 'Your client'),
        proposedByRole: isProposedByTutor ? 'tutor' : 'client',
        slotExpiresAt: slotReservedUntil,
      };

      try {
        await sendTimeProposedEmail(emailData);
        console.log('[Schedule Propose] Email sent to other party');
      } catch (emailError) {
        console.error('[Schedule Propose] Failed to send email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingId,
        session_start_time: proposedTime.toISOString(),
        scheduling_status: 'proposed',
        proposed_by: user.id,
        slot_reserved_until: slotReservedUntil.toISOString(),
      },
      message: 'Time proposed successfully. Waiting for confirmation from the other party.',
    });
  } catch (error) {
    console.error('[Schedule Propose] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
