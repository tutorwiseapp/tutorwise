/**
 * Filename: apps/web/src/app/api/bookings/[id]/status/route.ts
 * Purpose: Update booking status with email notifications
 * Created: 2025-01-27
 *
 * Sends appropriate emails when:
 * - Booking is confirmed (to client, tutor, and agent if referral)
 * - Booking is cancelled (to client, tutor, and agent if referral)
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  sendBookingConfirmationEmails,
  sendBookingCancellationEmails,
  type BookingEmailData,
} from '@/lib/email-templates/booking';
import { syncBookingCancellation } from '@/lib/calendar/sync-booking';

export const dynamic = 'force-dynamic';

type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Declined';

interface StatusUpdateBody {
  status: BookingStatus;
  reason?: string; // For cancellation
}

// Valid status transitions - prevents invalid state changes
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  'Pending': ['Confirmed', 'Cancelled', 'Declined'],
  'Confirmed': ['Completed', 'Cancelled'],
  'Completed': [], // Terminal state - no transitions allowed
  'Cancelled': [], // Terminal state - no transitions allowed
  'Declined': [], // Terminal state - no transitions allowed
};

/**
 * PATCH /api/bookings/[id]/status
 * Update booking status and send appropriate email notifications
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: StatusUpdateBody = await request.json();
    const { status, reason } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses: BookingStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Declined'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // 4. Get current booking with full details for email
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(
        `
        *,
        client:profiles!client_id(id, full_name, email),
        tutor:profiles!tutor_id(id, full_name, email),
        agent:profiles!agent_id(id, full_name, email)
      `
      )
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 5. Authorization: Verify user is participant (client/tutor/agent) OR admin
    const isParticipant =
      user.id === booking.client_id ||
      user.id === booking.tutor_id ||
      user.id === booking.agent_id;

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.roles?.includes('admin');

    if (!isParticipant && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to update this booking status' },
        { status: 403 }
      );
    }

    const previousStatus = booking.status;

    // 6. Validate status transition
    const allowedTransitions = VALID_TRANSITIONS[previousStatus as BookingStatus];
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${previousStatus}' to '${status}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
          code: 'INVALID_TRANSITION'
        },
        { status: 400 }
      );
    }

    // 7. Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('[Booking Status] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    // 8. Prepare email data
    const emailData: BookingEmailData = {
      bookingId: booking.id,
      serviceName: booking.service_name,
      sessionDate: new Date(booking.session_start_time),
      sessionDuration: booking.session_duration,
      amount: booking.amount,
      subjects: booking.subjects,
      deliveryMode: booking.delivery_mode,
      locationCity: booking.location_city,
      tutorName: booking.tutor?.full_name || 'Tutor',
      tutorEmail: booking.tutor?.email || '',
      clientName: booking.client?.full_name || 'Client',
      clientEmail: booking.client?.email || '',
      agentName: booking.agent?.full_name,
      agentEmail: booking.agent?.email,
      bookingType: booking.booking_type,
    };

    // 9. Send appropriate emails based on status change
    let emailResults = { client: false, tutor: false, agent: false };

    if (status === 'Confirmed' && previousStatus !== 'Confirmed') {
      // Send confirmation emails to all parties
      if (emailData.clientEmail && emailData.tutorEmail) {
        emailResults = await sendBookingConfirmationEmails(emailData);
        console.log('[Booking Status] Confirmation emails sent:', emailResults);
      }
    } else if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
      // Send cancellation emails to all parties
      if (emailData.clientEmail && emailData.tutorEmail) {
        emailResults = await sendBookingCancellationEmails(
          emailData,
          'the administrator',
          reason
        );
        console.log('[Booking Status] Cancellation emails sent:', emailResults);
      }

      // Delete calendar events (async - don't block response)
      syncBookingCancellation(booking)
        .then(() => console.log('[Booking Status] Calendar events deleted for booking:', id))
        .catch((err) => console.error('[Booking Status] Calendar sync error:', err));
    }

    return NextResponse.json({
      success: true,
      booking: {
        id,
        status,
        previousStatus,
      },
      emailsSent: emailResults,
    });
  } catch (error) {
    console.error('[Booking Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
