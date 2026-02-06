/**
 * Filename: apps/web/src/app/api/bookings/[id]/schedule/reschedule/route.ts
 * Purpose: Request to reschedule a confirmed booking
 * Created: 2026-02-05
 *
 * Part of the 5-stage booking workflow: Discover > Book > SCHEDULE > Pay > Review
 *
 * Reschedule rules:
 * - Maximum 2 reschedules per party (4 total)
 * - Both parties can request reschedule
 * - New time goes back to 'proposed' state for confirmation
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  validateProposedTime,
  canReschedule,
  getSlotReservationExpiry,
  DEFAULT_SCHEDULING_RULES,
} from '@/lib/scheduling/rules';
import { sendRescheduleRequestedEmail, type SchedulingEmailData } from '@/lib/email-templates/booking';

export const dynamic = 'force-dynamic';

interface RescheduleBody {
  proposed_date: string; // ISO timestamp
  reason?: string; // Optional reason for reschedule
}

/**
 * POST /api/bookings/[id]/schedule/reschedule
 * Request to reschedule a booking to a new time
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
    const body: RescheduleBody = await request.json();
    const { proposed_date, reason } = body;

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

    // 3. Get booking (include profiles for email)
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
        { error: 'You are not authorized to reschedule this booking' },
        { status: 403 }
      );
    }

    // 5. Validate booking state - can only reschedule Confirmed bookings
    if (booking.status !== 'Confirmed') {
      return NextResponse.json(
        { error: 'Only confirmed bookings can be rescheduled' },
        { status: 400 }
      );
    }

    // 6. Check reschedule limit
    const rescheduleCheck = canReschedule(booking.reschedule_count || 0, DEFAULT_SCHEDULING_RULES);
    if (!rescheduleCheck.valid) {
      return NextResponse.json(
        { error: rescheduleCheck.reason, code: rescheduleCheck.code },
        { status: 400 }
      );
    }

    // 7. Validate proposed time
    const validation = validateProposedTime(proposedTime, DEFAULT_SCHEDULING_RULES);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason, code: validation.code },
        { status: 400 }
      );
    }

    // 8. Calculate slot reservation expiry
    const slotReservedUntil = getSlotReservationExpiry(DEFAULT_SCHEDULING_RULES);

    // 9. Update booking with new proposed time
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        session_start_time: proposedTime.toISOString(),
        scheduling_status: 'proposed', // Back to proposed for confirmation
        proposed_by: user.id,
        proposed_at: new Date().toISOString(),
        slot_reserved_until: slotReservedUntil.toISOString(),
        schedule_confirmed_by: null,
        schedule_confirmed_at: null,
        reschedule_count: (booking.reschedule_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[Schedule Reschedule] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to reschedule booking' },
        { status: 500 }
      );
    }

    // 10. Log reschedule event for audit
    await supabase.from('audit_logs').insert({
      profile_id: user.id,
      action: 'booking_rescheduled',
      resource_type: 'booking',
      resource_id: bookingId,
      details: {
        previous_time: booking.session_start_time,
        new_time: proposedTime.toISOString(),
        reason: reason || null,
        reschedule_number: (booking.reschedule_count || 0) + 1,
      },
    });

    // 11. Send reschedule notification email to other party
    const isProposedByTutor = user.id === booking.tutor_id;
    const proposerName = isProposedByTutor ? booking.tutor?.full_name : booking.client?.full_name;
    const newRescheduleCount = (booking.reschedule_count || 0) + 1;

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
        rescheduleCount: newRescheduleCount,
      };

      try {
        await sendRescheduleRequestedEmail(emailData);
        console.log('[Schedule Reschedule] Email sent to other party');
      } catch (emailError) {
        console.error('[Schedule Reschedule] Failed to send email:', emailError);
      }
    }

    const remainingReschedules =
      DEFAULT_SCHEDULING_RULES.rescheduleLimit * 2 - ((booking.reschedule_count || 0) + 1);

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingId,
        session_start_time: proposedTime.toISOString(),
        scheduling_status: 'proposed',
        proposed_by: user.id,
        reschedule_count: (booking.reschedule_count || 0) + 1,
        slot_reserved_until: slotReservedUntil.toISOString(),
      },
      remaining_reschedules: remainingReschedules,
      message: `Reschedule requested. ${remainingReschedules} reschedule(s) remaining. Waiting for confirmation from the other party.`,
    });
  } catch (error) {
    console.error('[Schedule Reschedule] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
