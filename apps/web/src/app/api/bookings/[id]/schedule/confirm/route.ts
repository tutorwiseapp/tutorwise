/**
 * Filename: apps/web/src/app/api/bookings/[id]/schedule/confirm/route.ts
 * Purpose: Confirm a proposed session time (Stage 3: SCHEDULE → Stage 4: PAY)
 * Created: 2026-02-05
 *
 * Part of the 5-stage booking workflow: Discover > Book > SCHEDULE > PAY > Review
 *
 * When confirming:
 * - FREE sessions: Immediately set to Confirmed status
 * - PAID sessions: Return Stripe checkout URL, set Confirmed after payment
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isSlotReservationExpired } from '@/lib/scheduling/rules';
import Stripe from 'stripe';
import { sendSchedulingConfirmationEmails, type SchedulingEmailData } from '@/lib/email-templates/booking';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /api/bookings/[id]/schedule/confirm
 * Confirm the proposed session time
 * - For FREE sessions: Sets status to Confirmed
 * - For PAID sessions: Creates Stripe checkout and returns URL
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

    // 2. Get booking with full details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!client_id(id, full_name, email, stripe_customer_id),
        tutor:profiles!tutor_id(id, full_name, email, stripe_account_id)
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 3. Verify user is a participant (but NOT the proposer)
    if (user.id !== booking.client_id && user.id !== booking.tutor_id) {
      return NextResponse.json(
        { error: 'You are not authorized to confirm this booking' },
        { status: 403 }
      );
    }

    // The confirmer must be different from the proposer
    if (user.id === booking.proposed_by) {
      return NextResponse.json(
        { error: 'You cannot confirm your own proposal. The other party must confirm.' },
        { status: 400 }
      );
    }

    // 4. Validate booking state
    if (booking.status !== 'Pending') {
      return NextResponse.json(
        { error: 'Only pending bookings can be confirmed' },
        { status: 400 }
      );
    }

    if (booking.scheduling_status !== 'proposed') {
      return NextResponse.json(
        { error: 'No proposed time to confirm. Please propose a time first.' },
        { status: 400 }
      );
    }

    // 5. Check if slot reservation has expired
    if (isSlotReservationExpired(booking.slot_reserved_until)) {
      // Reset to unscheduled
      await supabase
        .from('bookings')
        .update({
          scheduling_status: 'unscheduled',
          session_start_time: null,
          proposed_by: null,
          proposed_at: null,
          slot_reserved_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      return NextResponse.json(
        { error: 'The proposed time slot has expired. Please propose a new time.' },
        { status: 400 }
      );
    }

    // 6. Determine if this is a free or paid session
    const isFreeSession = !booking.amount || booking.amount === 0;

    if (isFreeSession) {
      // FREE SESSION: Confirm immediately
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          scheduling_status: 'scheduled',
          schedule_confirmed_by: user.id,
          schedule_confirmed_at: new Date().toISOString(),
          slot_reserved_until: null, // Clear reservation
          status: 'Confirmed', // Move to Confirmed status
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('[Schedule Confirm] Update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to confirm booking' },
          { status: 500 }
        );
      }

      // Send confirmation emails to both parties
      if (booking.client?.email && booking.tutor?.email) {
        const emailData: SchedulingEmailData = {
          bookingId: booking.id,
          serviceName: booking.service_name,
          proposedTime: new Date(booking.session_start_time),
          sessionDuration: booking.session_duration,
          amount: 0, // Free session
          subjects: booking.subjects,
          deliveryMode: booking.delivery_mode,
          locationCity: booking.location_city,
          tutorName: booking.tutor.full_name || 'Tutor',
          tutorEmail: booking.tutor.email,
          clientName: booking.client.full_name || 'Client',
          clientEmail: booking.client.email,
          proposedByName: booking.proposed_by === booking.tutor_id
            ? booking.tutor.full_name || 'Tutor'
            : booking.client.full_name || 'Client',
          proposedByRole: booking.proposed_by === booking.tutor_id ? 'tutor' : 'client',
        };

        try {
          await sendSchedulingConfirmationEmails(emailData);
          console.log('[Schedule Confirm] Confirmation emails sent');
        } catch (emailError) {
          console.error('[Schedule Confirm] Failed to send emails:', emailError);
        }
      }

      return NextResponse.json({
        success: true,
        status: 'Confirmed',
        scheduling_status: 'scheduled',
        requires_payment: false,
        message: 'Session confirmed! You can now access WiseSpace.',
      });
    } else {
      // PAID SESSION: Create Stripe checkout session
      const sessionDate = new Date(booking.session_start_time);
      const formattedDate = sessionDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Europe/London',
      });

      // Mark as scheduled (pending payment)
      await supabase
        .from('bookings')
        .update({
          scheduling_status: 'scheduled',
          schedule_confirmed_by: user.id,
          schedule_confirmed_at: new Date().toISOString(),
          slot_reserved_until: null, // Clear reservation
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      // Create Stripe checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: `${booking.service_name} Session`,
                description: `${booking.session_duration} minutes with ${booking.tutor?.full_name || 'Tutor'} on ${formattedDate}`,
              },
              unit_amount: Math.round(booking.amount * 100), // Convert to pence
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?payment=cancelled`,
        customer: booking.client?.stripe_customer_id || undefined,
        metadata: {
          booking_id: bookingId,
          scheduling_confirmed: 'true', // Flag for webhook to know this is a scheduled booking
          tutor_id: booking.tutor_id,
          client_id: booking.client_id,
        },
        payment_intent_data: booking.tutor?.stripe_account_id
          ? {
              application_fee_amount: Math.round(booking.amount * 10), // 10% platform fee
              transfer_data: {
                destination: booking.tutor.stripe_account_id,
              },
            }
          : undefined,
      });

      // Store checkout session ID
      await supabase
        .from('bookings')
        .update({
          stripe_checkout_session_id: checkoutSession.id,
        })
        .eq('id', bookingId);

      return NextResponse.json({
        success: true,
        status: 'Pending',
        scheduling_status: 'scheduled',
        requires_payment: true,
        checkout_url: checkoutSession.url,
        message: 'Time confirmed! Please complete payment to finalize your booking.',
      });
    }
  } catch (error) {
    console.error('[Schedule Confirm] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
