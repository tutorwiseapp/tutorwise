/**
 * Filename: apps/web/src/app/api/bookings/[id]/schedule/withdraw/route.ts
 * Purpose: Withdraw or decline a proposed session time
 * Created: 2026-02-06
 *
 * Allows either party to:
 * - Proposer: Withdraw their time proposal
 * - Other party: Decline the proposed time
 *
 * This clears the proposed time and resets the booking to 'unscheduled' state.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendTimeWithdrawnEmail, type SchedulingEmailData } from '@/lib/email-templates/booking';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/bookings/[id]/schedule/withdraw
 * Withdraw or decline a proposed session time
 */
export async function DELETE(
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

    // 2. Get booking and verify user is a participant
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

    // Verify user is either client or tutor
    if (user.id !== booking.client_id && user.id !== booking.tutor_id) {
      return NextResponse.json(
        { error: 'You are not authorized to modify this booking' },
        { status: 403 }
      );
    }

    // 3. Verify booking has a proposed time to withdraw
    if (booking.scheduling_status !== 'proposed') {
      return NextResponse.json(
        { error: 'No proposal to withdraw. Booking is not in proposed state.' },
        { status: 400 }
      );
    }

    if (!booking.session_start_time) {
      return NextResponse.json(
        { error: 'No proposed time to withdraw' },
        { status: 400 }
      );
    }

    // 4. Determine action: withdraw (by proposer) or decline (by other party)
    const isProposer = user.id === booking.proposed_by;
    const action = isProposer ? 'withdrawn' : 'declined';

    // 5. Clear proposal and reset to unscheduled
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        session_start_time: null,
        scheduling_status: 'unscheduled',
        proposed_by: null,
        proposed_at: null,
        schedule_confirmed_by: null,
        schedule_confirmed_at: null,
        slot_reserved_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[Schedule Withdraw] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to withdraw proposal' },
        { status: 500 }
      );
    }

    // 6. Send notification email to other party
    const actorName = isProposer
      ? (booking.tutor?.id === user.id ? booking.tutor?.full_name : booking.client?.full_name)
      : (booking.tutor?.id === user.id ? booking.tutor?.full_name : booking.client?.full_name);

    if (booking.client?.email && booking.tutor?.email) {
      const emailData: SchedulingEmailData = {
        bookingId: booking.id,
        serviceName: booking.service_name,
        proposedTime: new Date(booking.session_start_time),
        sessionDuration: booking.session_duration,
        amount: booking.amount,
        subjects: booking.subjects,
        deliveryMode: booking.delivery_mode,
        locationCity: booking.location_city,
        tutorName: booking.tutor.full_name || 'Tutor',
        tutorEmail: booking.tutor.email,
        clientName: booking.client.full_name || 'Client',
        clientEmail: booking.client.email,
        proposedByName: actorName || 'The other party',
        proposedByRole: isProposer ? (booking.tutor?.id === user.id ? 'tutor' : 'client') : 'other',
        action,
      };

      try {
        await sendTimeWithdrawnEmail(emailData);
        console.log('[Schedule Withdraw] Email sent to other party');
      } catch (emailError) {
        console.error('[Schedule Withdraw] Failed to send email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingId,
        scheduling_status: 'unscheduled',
        session_start_time: null,
      },
      message: `Time proposal ${action} successfully. You can now propose a new time.`,
    });
  } catch (error) {
    console.error('[Schedule Withdraw] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
