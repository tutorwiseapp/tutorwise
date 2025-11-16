/*
 * Filename: src/app/api/webhooks/stripe/route.ts
 * Purpose: Handles Stripe webhook events with idempotency and DLQ support
 * Created: 2025-11-02
 * Updated: 2025-11-11 - v4.9: Added payout event handling and production hardening
 * Specification: SDD v4.9, Section 3.1 & 3.3 - Payment & Payout Processing
 * Change Summary:
 * - v3.6: Calls handle_successful_payment RPC for atomic commission splits
 * - v4.9: Adds stripe_checkout_id for idempotency, DLQ for failed webhooks
 * - v4.9: Added payout event handlers (paid, failed, canceled, updated)
 * - v4.9: Production hardening with comprehensive logging and error handling
 *
 * CRITICAL: This endpoint handles real-time payment and payout status updates.
 * All operations must be idempotent and properly logged.
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

        // v5.7: Save wiselist referrer for attribution tracking
        const wiselistReferrerId = session.metadata?.wiselist_referrer_id;
        if (wiselistReferrerId) {
          console.log(`Recording wiselist referrer ${wiselistReferrerId} for booking ${booking_id}`);

          const { error: referrerError } = await supabase
            .from('bookings')
            .update({ booking_referrer_id: wiselistReferrerId })
            .eq('id', booking_id);

          if (referrerError) {
            console.error('Failed to save wiselist referrer:', referrerError);
            // Non-critical error - don't throw
          } else {
            console.log(`Successfully recorded wiselist referrer for booking ${booking_id}`);
          }
        }

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

      // v4.9: Payout event handlers for withdrawal status tracking
      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        console.log(`[WEBHOOK:PAYOUT] Payout paid: ${payout.id}`);

        const supabase = await createClient();

        // Update transaction status to 'paid_out'
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'paid_out',
            description: `Payout completed: ${payout.id}`,
          })
          .eq('stripe_payout_id', payout.id);

        if (updateError) {
          console.error(`[WEBHOOK:PAYOUT] Failed to update transaction:`, updateError);
          throw updateError;
        }

        console.log(`[WEBHOOK:PAYOUT] Successfully marked payout ${payout.id} as paid`);
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        console.error(`[WEBHOOK:PAYOUT] Payout failed: ${payout.id}`, {
          failure_code: payout.failure_code,
          failure_message: payout.failure_message,
        });

        const supabase = await createClient();

        // Update transaction status to 'Failed' and log the reason
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'Failed',
            description: `Payout failed: ${payout.failure_message || payout.failure_code || 'Unknown error'}`,
          })
          .eq('stripe_payout_id', payout.id);

        if (updateError) {
          console.error(`[WEBHOOK:PAYOUT] Failed to update transaction:`, updateError);
          throw updateError;
        }

        // Refund the amount back to user's available balance
        // Find the withdrawal transaction and create a reversal
        const { data: failedTransaction } = await supabase
          .from('transactions')
          .select('profile_id, amount')
          .eq('stripe_payout_id', payout.id)
          .single();

        if (failedTransaction) {
          // Create reversal transaction to return funds
          await supabase
            .from('transactions')
            .insert({
              profile_id: failedTransaction.profile_id,
              type: 'Refund',
              description: `Payout reversal: ${payout.id} (${payout.failure_message || 'Failed to process'})`,
              amount: Math.abs(failedTransaction.amount), // Positive to add back
              status: 'available',
              available_at: new Date().toISOString(),
            });

          console.log(`[WEBHOOK:PAYOUT] Created reversal transaction for failed payout`);
        }

        break;
      }

      case 'payout.canceled': {
        const payout = event.data.object as Stripe.Payout;
        console.warn(`[WEBHOOK:PAYOUT] Payout canceled: ${payout.id}`);

        const supabase = await createClient();

        // Update transaction status to 'Failed'
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'Failed',
            description: `Payout canceled: ${payout.id}`,
          })
          .eq('stripe_payout_id', payout.id);

        if (updateError) {
          console.error(`[WEBHOOK:PAYOUT] Failed to update transaction:`, updateError);
          throw updateError;
        }

        // Refund the amount back to user's available balance
        const { data: canceledTransaction } = await supabase
          .from('transactions')
          .select('profile_id, amount')
          .eq('stripe_payout_id', payout.id)
          .single();

        if (canceledTransaction) {
          await supabase
            .from('transactions')
            .insert({
              profile_id: canceledTransaction.profile_id,
              type: 'Refund',
              description: `Payout cancellation reversal: ${payout.id}`,
              amount: Math.abs(canceledTransaction.amount), // Positive to add back
              status: 'available',
              available_at: new Date().toISOString(),
            });

          console.log(`[WEBHOOK:PAYOUT] Created reversal transaction for canceled payout`);
        }

        break;
      }

      case 'payout.updated': {
        const payout = event.data.object as Stripe.Payout;
        console.log(`[WEBHOOK:PAYOUT] Payout updated: ${payout.id}`, {
          status: payout.status,
          arrival_date: payout.arrival_date,
        });

        // Update transaction with latest payout status
        const supabase = await createClient();

        // Map Stripe payout status to our transaction status
        let transactionStatus: string = 'clearing';
        if (payout.status === 'paid') {
          transactionStatus = 'paid_out';
        } else if (payout.status === 'failed' || payout.status === 'canceled') {
          transactionStatus = 'Failed';
        } else if (payout.status === 'in_transit') {
          transactionStatus = 'paid_out';
        }

        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: transactionStatus,
            description: `Payout ${payout.status}: ${payout.id}`,
          })
          .eq('stripe_payout_id', payout.id);

        if (updateError) {
          console.error(`[WEBHOOK:PAYOUT] Failed to update transaction:`, updateError);
          // Non-critical error for status updates
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
