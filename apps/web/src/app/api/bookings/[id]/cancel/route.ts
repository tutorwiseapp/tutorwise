/**
 * Filename: apps/web/src/app/api/bookings/[id]/cancel/route.ts
 * Purpose: Handle booking cancellations with policy enforcement and Stripe refunds
 * Created: 2026-02-06
 *
 * Implements the cancellation policy:
 * - Client cancels 24h+: 100% refund (minus Stripe fee ~3%)
 * - Client cancels <24h: No refund, tutor gets full payment
 * - Tutor cancels: 100% refund (minus Stripe fee) + CaaS penalty
 *
 * Processes automatic Stripe refunds when applicable.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculateRefund, updateTutorCaaSScore, reverseBookingCommissions } from '@/lib/booking-policies/cancellation';
import { stripe } from '@/lib/stripe';
import { sendBookingCancellationEmails } from '@/lib/email-templates/booking';
import { checkRateLimit, rateLimitError, rateLimitHeaders } from '@/middleware/rateLimiting';

export const dynamic = 'force-dynamic';

interface CancelBookingBody {
  reason?: string; // Optional cancellation reason
}

/**
 * POST /api/bookings/[id]/cancel
 * Cancel a booking and process refund according to policy
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

    // 1a. Rate limit check (security: prevent refund spam)
    const rateLimitResult = await checkRateLimit(user.id, 'payment:refund');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimitResult),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetAt)
        }
      );
    }

    // 2. Parse request body
    const body: CancelBookingBody = await request.json();
    const { reason } = body;

    // 3. Get booking with full details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!client_id(id, full_name, email),
        tutor:profiles!tutor_id(id, full_name, email),
        agent:profiles!agent_id(id, full_name, email)
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 4. Verify user is authorized (client, tutor, or admin)
    const isClient = user.id === booking.client_id;
    const isTutor = user.id === booking.tutor_id;

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.roles?.includes('admin');

    if (!isClient && !isTutor && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to cancel this booking' },
        { status: 403 }
      );
    }

    // 5. Validate booking can be cancelled
    if (booking.status === 'Cancelled') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      );
    }

    if (booking.status === 'Completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed booking' },
        { status: 400 }
      );
    }

    if (!booking.session_start_time) {
      return NextResponse.json(
        { error: 'Booking has no scheduled time' },
        { status: 400 }
      );
    }

    // 6. Calculate hours until session
    const sessionStart = new Date(booking.session_start_time);
    const now = new Date();
    const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 7. Determine who is cancelling
    // Admin cancellations are treated as "client" cancellations (time-based policy)
    const cancelledBy: 'client' | 'tutor' = isTutor ? 'tutor' : 'client';

    // 8. Calculate refund using policy
    const refundCalc = calculateRefund(
      booking.amount,
      hoursUntilSession,
      cancelledBy,
      'cancelled'
    );

    console.log('[Cancel Booking] Policy calculation:', {
      bookingId,
      amount: booking.amount,
      hoursUntilSession: hoursUntilSession.toFixed(2),
      cancelledBy,
      policy: refundCalc.policyApplied,
      clientRefund: refundCalc.clientRefund,
      stripeFee: refundCalc.stripeFee,
      tutorPayout: refundCalc.tutorPayout,
      caasImpact: refundCalc.caasImpact
    });

    // 9. Process Stripe refund if applicable (with idempotency check)
    let stripeRefundId: string | null = null;

    if (refundCalc.clientRefund > 0 && booking.payment_status === 'Paid') {
      try {
        if (booking.stripe_payment_intent_id) {
          // MEDIUM Priority Fix: Check if refund already exists (idempotency)
          const existingRefunds = await stripe.refunds.list({
            payment_intent: booking.stripe_payment_intent_id,
            limit: 1
          });

          if (existingRefunds.data.length > 0) {
            console.log('[Cancel Booking] Refund already exists:', existingRefunds.data[0].id);
            stripeRefundId = existingRefunds.data[0].id;
          } else {
            // Create new refund with idempotency key
            const idempotencyKey = `refund_${bookingId}_${Date.now()}`;

            const stripeRefund = await stripe.refunds.create({
              payment_intent: booking.stripe_payment_intent_id,
              amount: Math.round(refundCalc.clientRefund * 100), // Net refund in pence
              reason: 'requested_by_customer',
              metadata: {
                booking_id: bookingId,
                cancelled_by: cancelledBy,
                policy_applied: refundCalc.policyApplied,
                gross_amount: refundCalc.clientRefundGross.toString(),
                stripe_fee: refundCalc.stripeFee.toString(),
                net_refund: refundCalc.clientRefund.toString()
              }
            }, {
              idempotencyKey // Stripe idempotency protection
            });

            stripeRefundId = stripeRefund.id;

            console.log('[Cancel Booking] Stripe refund processed:', {
              refundId: stripeRefundId,
              grossAmount: refundCalc.clientRefundGross,
              stripeFee: refundCalc.stripeFee,
              netRefund: refundCalc.clientRefund
            });
          }
        }
      } catch (stripeError) {
        console.error('[Cancel Booking] Stripe refund failed:', stripeError);
        return NextResponse.json(
          { error: 'Failed to process refund. Please contact support.' },
          { status: 500 }
        );
      }
    }

    // 10. Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'Cancelled',
        payment_status: refundCalc.clientRefund > 0 ? 'Refunded' : 'Paid',
        cancellation_reason: reason || `cancelled_by_${cancelledBy}`,
        cancellation_policy_applied: refundCalc.policyApplied,
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
        caas_impact: refundCalc.caasImpact,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[Cancel Booking] Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    // 11. Update tutor's CaaS score if they cancelled
    if (cancelledBy === 'tutor' && refundCalc.caasImpact !== 0) {
      await updateTutorCaaSScore(booking.tutor_id, refundCalc.caasImpact, 'cancellation', bookingId);
    }

    // 12. Reverse commission transactions if refund was issued
    if (refundCalc.clientRefund > 0) {
      await reverseBookingCommissions(bookingId);
    }

    // 13. Send cancellation emails to all parties
    try {
      const emailData = {
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

      await sendBookingCancellationEmails(
        emailData,
        cancelledBy === 'client' ? emailData.clientName : emailData.tutorName,
        reason
      );

      console.log('[Cancel Booking] Cancellation emails sent');
    } catch (emailError) {
      console.error('[Cancel Booking] Email error:', emailError);
      // Don't fail the request if emails fail
    }

    // 14. Build response message
    let message = '';
    if (isAdmin) {
      // Admin cancellation message
      if (refundCalc.clientRefund > 0) {
        message = `Booking cancelled by admin. Client will receive a refund of £${refundCalc.clientRefund.toFixed(2)} (original amount £${refundCalc.clientRefundGross.toFixed(2)} minus £${refundCalc.stripeFee.toFixed(2)} Stripe processing fee). Refund will appear in their account within 5-10 business days.`;
      } else {
        message = `Booking cancelled by admin. No refund issued as cancellation was within 24 hours of the session. The tutor will receive the full payment of £${booking.amount.toFixed(2)}.`;
      }
    } else if (cancelledBy === 'client') {
      if (refundCalc.clientRefund > 0) {
        message = `Booking cancelled successfully. You will receive a refund of £${refundCalc.clientRefund.toFixed(2)} (original amount £${refundCalc.clientRefundGross.toFixed(2)} minus £${refundCalc.stripeFee.toFixed(2)} Stripe processing fee). Refund will appear in your account within 5-10 business days.`;
      } else {
        message = `Booking cancelled. No refund issued as you cancelled within 24 hours of the session. The tutor will receive the full payment of £${booking.amount.toFixed(2)}.`;
      }
    } else {
      message = `Booking cancelled. The client will receive a full refund of £${refundCalc.clientRefund.toFixed(2)} (minus Stripe fee). Your CaaS reputation score has been reduced by ${Math.abs(refundCalc.caasImpact)} points.`;
    }

    return NextResponse.json({
      success: true,
      message,
      refund: {
        grossAmount: refundCalc.clientRefundGross,
        stripeFee: refundCalc.stripeFee,
        netRefund: refundCalc.clientRefund,
        tutorPayout: refundCalc.tutorPayout,
        caasImpact: refundCalc.caasImpact,
        policyApplied: refundCalc.policyApplied,
        stripeRefundId
      }
    });
  } catch (error) {
    console.error('[Cancel Booking] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
