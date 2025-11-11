/*
 * Filename: src/app/api/webhooks/stripe/route.ts
 * Purpose: Handles Stripe webhook events with idempotency and DLQ support
 * Created: 2025-11-02
 * Updated: 2025-11-11 - v4.9: Added idempotency and Dead-Letter Queue (DLQ)
 * Specification: SDD v4.9, Section 3.1 & 3.3
 * Change Summary:
 * - v3.6: Calls handle_successful_payment RPC for atomic commission splits
 * - v4.9: Adds stripe_checkout_id for idempotency, DLQ for failed webhooks
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events
 * Important: This endpoint must be configured in Stripe Dashboard
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new NextResponse('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return new NextResponse('Webhook signature verification failed', { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get booking_id from metadata
        const booking_id = session.metadata?.booking_id;

        if (!booking_id) {
          console.error('No booking_id in session metadata');
          return new NextResponse('Missing booking_id', { status: 400 });
        }

        console.log(`Payment succeeded for booking: ${booking_id}, checkout: ${session.id}`);

        // Call the RPC function to process payment atomically
        // v4.9: Pass stripe_checkout_id for idempotency check
        const supabase = await createClient();

        const { error: rpcError } = await supabase.rpc('handle_successful_payment', {
          p_booking_id: booking_id,
          p_stripe_checkout_id: session.id // v4.9: Idempotency key
        });

        if (rpcError) {
          console.error('RPC handle_successful_payment failed:', rpcError);
          // Don't return error to Stripe - we want to retry
          throw rpcError;
        }

        console.log(`Successfully processed payment for booking ${booking_id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', paymentIntent.id);

        // Get booking_id from metadata
        const booking_id = paymentIntent.metadata?.booking_id;

        if (booking_id) {
          // Update booking payment_status to 'Failed'
          const supabase = await createClient();
          await supabase
            .from('bookings')
            .update({ payment_status: 'Failed' })
            .eq('id', booking_id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);

    // v4.9: Log to Dead-Letter Queue (DLQ) for manual review
    try {
      const supabase = await createClient();

      // Extract booking_id safely from metadata if it exists
      const booking_id = (event.data.object as any).metadata?.booking_id || null;

      await supabase.from('failed_webhooks').insert({
        event_id: event.id,
        event_type: event.type,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        payload: event as any,
        booking_id
      });

      console.log(`Logged failed webhook ${event.id} to DLQ`);
    } catch (dlqError) {
      console.error('Failed to log to DLQ:', dlqError);
    }

    // Return 200 to prevent Stripe retries (already in DLQ)
    return NextResponse.json({
      received: true,
      error: 'Event processing failed, logged to DLQ for manual review'
    }, { status: 200 });
  }
}
