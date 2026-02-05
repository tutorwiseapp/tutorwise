/*
 * Filename: src/app/api/webhooks/stripe/route.ts
 * Purpose: Handles Stripe webhook events with idempotency and DLQ support
 * Created: 2025-11-02
 * Updated: 2025-12-15 - v7.0: Added subscription event handling for Organisation Premium
 * Specification: SDD v7.0, Section 3.1, 3.3, 5.2 - Payment, Payout & Subscription Processing
 * Change Summary:
 * - v3.6: Calls handle_successful_payment RPC for atomic commission splits
 * - v4.9: Adds stripe_checkout_id for idempotency, DLQ for failed webhooks
 * - v4.9: Added payout event handlers (paid, failed, canceled, updated)
 * - v4.9: Production hardening with comprehensive logging and error handling
 * - v7.0: Added subscription event handlers (created, updated, deleted, invoice succeeded/failed)
 *
 * CRITICAL: This endpoint handles real-time payment, payout, and subscription status updates.
 * All operations must be idempotent and properly logged.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import {
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
  type PaymentEmailData,
} from '@/lib/email-templates/payment';

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

        // v8.0: Check if this is from the new scheduling flow
        const isSchedulingConfirmed = session.metadata?.scheduling_confirmed === 'true';

        const supabase = await createClient();

        // v8.0: For scheduled bookings, verify scheduling was completed before payment
        if (isSchedulingConfirmed) {
          const { data: booking } = await supabase
            .from('bookings')
            .select('scheduling_status')
            .eq('id', booking_id)
            .single();

          if (booking?.scheduling_status !== 'scheduled') {
            console.error(`[WEBHOOK] Booking ${booking_id} not scheduled but payment received. Setting to scheduled.`);
            // Safety: ensure scheduling_status is set
            await supabase
              .from('bookings')
              .update({ scheduling_status: 'scheduled' })
              .eq('id', booking_id);
          }
        }

        // Call the RPC function to process payment atomically
        // v4.9: Pass stripe_checkout_id for idempotency check
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

        // Send payment receipt email to client (async - don't block webhook)
        try {
          const { data: booking } = await supabase
            .from('bookings')
            .select(`
              *,
              client:profiles!client_id(full_name, email),
              tutor:profiles!tutor_id(full_name)
            `)
            .eq('id', booking_id)
            .single();

          if (booking?.client?.email) {
            const emailData: PaymentEmailData = {
              bookingId: booking.id,
              serviceName: booking.service_name,
              sessionDate: new Date(booking.session_start_time),
              sessionDuration: booking.session_duration,
              amount: booking.amount,
              subjects: booking.subjects,
              tutorName: booking.tutor?.full_name || 'Tutor',
              clientName: booking.client?.full_name || 'Client',
              clientEmail: booking.client.email,
              // Note: receipt_url is on Charge object, not Session - omitted for simplicity
            };

            sendPaymentReceiptEmail(emailData)
              .then(() => console.log('[Webhook] Payment receipt email sent to:', booking.client.email))
              .catch((err) => console.error('[Webhook] Failed to send payment receipt:', err));
          }
        } catch (emailError) {
          console.error('[Webhook] Error preparing payment receipt email:', emailError);
          // Non-critical - don't throw
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

          // Send payment failed email to client (async - don't block webhook)
          try {
            const { data: booking } = await supabase
              .from('bookings')
              .select(`
                *,
                client:profiles!client_id(full_name, email),
                tutor:profiles!tutor_id(full_name)
              `)
              .eq('id', booking_id)
              .single();

            if (booking?.client?.email) {
              const emailData: PaymentEmailData = {
                bookingId: booking.id,
                serviceName: booking.service_name,
                sessionDate: new Date(booking.session_start_time),
                sessionDuration: booking.session_duration,
                amount: booking.amount,
                subjects: booking.subjects,
                tutorName: booking.tutor?.full_name || 'Tutor',
                clientName: booking.client?.full_name || 'Client',
                clientEmail: booking.client.email,
              };

              const failureReason = paymentIntent.last_payment_error?.message || undefined;

              sendPaymentFailedEmail(emailData, failureReason)
                .then(() => console.log('[Webhook] Payment failed email sent to:', booking.client.email))
                .catch((err) => console.error('[Webhook] Failed to send payment failed email:', err));
            }
          } catch (emailError) {
            console.error('[Webhook] Error preparing payment failed email:', emailError);
            // Non-critical - don't throw
          }
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
        // Find the withdrawal transaction and create a reversal (Migrations 109, 111: with context)
        const { data: failedTransaction } = await supabase
          .from('transactions')
          .select('profile_id, amount, service_name, subjects, session_date, location_type, tutor_name, client_name, agent_name')
          .eq('stripe_payout_id', payout.id)
          .single();

        if (failedTransaction) {
          // Create reversal transaction to return funds (Migrations 109, 111: copy context)
          await supabase
            .from('transactions')
            .insert({
              profile_id: failedTransaction.profile_id,
              type: 'Refund',
              description: `Payout reversal: ${payout.id} (${payout.failure_message || 'Failed to process'})`,
              amount: Math.abs(failedTransaction.amount), // Positive to add back
              status: 'available',
              available_at: new Date().toISOString(),
              // Migrations 109, 111: Copy context from original transaction
              service_name: failedTransaction.service_name,
              subjects: failedTransaction.subjects,
              session_date: failedTransaction.session_date,
              location_type: failedTransaction.location_type,
              tutor_name: failedTransaction.tutor_name,
              client_name: failedTransaction.client_name,
              agent_name: failedTransaction.agent_name,
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

        // Refund the amount back to user's available balance (Migrations 109, 111: with context)
        const { data: canceledTransaction } = await supabase
          .from('transactions')
          .select('profile_id, amount, service_name, subjects, session_date, location_type, tutor_name, client_name, agent_name')
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
              // Migrations 109, 111: Copy context from original transaction
              service_name: canceledTransaction.service_name,
              subjects: canceledTransaction.subjects,
              session_date: canceledTransaction.session_date,
              location_type: canceledTransaction.location_type,
              tutor_name: canceledTransaction.tutor_name,
              client_name: canceledTransaction.client_name,
              agent_name: canceledTransaction.agent_name,
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

      // v7.0: Organisation Premium subscription event handlers
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[WEBHOOK:SUBSCRIPTION] Subscription created: ${subscription.id}`);

        const organisationId = subscription.metadata?.organisation_id;

        if (!organisationId) {
          console.error('[WEBHOOK:SUBSCRIPTION] No organisation_id in subscription metadata');
          throw new Error('Missing organisation_id in subscription metadata');
        }

        const supabase = await createClient();

        // Create organisation_subscriptions record
        const { error: insertError } = await supabase
          .from('organisation_subscriptions')
          .insert({
            organisation_id: organisationId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            trial_start: (subscription as any).trial_start
              ? new Date((subscription as any).trial_start * 1000).toISOString()
              : null,
            trial_end: (subscription as any).trial_end
              ? new Date((subscription as any).trial_end * 1000).toISOString()
              : null,
            current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: (subscription as any).cancel_at_period_end,
          });

        if (insertError) {
          console.error('[WEBHOOK:SUBSCRIPTION] Failed to create subscription record:', insertError);
          throw insertError;
        }

        console.log(`[WEBHOOK:SUBSCRIPTION] Created subscription record for organisation ${organisationId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[WEBHOOK:SUBSCRIPTION] Subscription updated: ${subscription.id}`, {
          status: subscription.status,
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
        });

        const supabase = await createClient();

        // Update subscription status in database
        const { error: updateError } = await supabase
          .from('organisation_subscriptions')
          .update({
            status: subscription.status,
            trial_start: (subscription as any).trial_start
              ? new Date((subscription as any).trial_start * 1000).toISOString()
              : null,
            trial_end: (subscription as any).trial_end
              ? new Date((subscription as any).trial_end * 1000).toISOString()
              : null,
            current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: (subscription as any).cancel_at_period_end,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('[WEBHOOK:SUBSCRIPTION] Failed to update subscription:', updateError);
          throw updateError;
        }

        console.log(`[WEBHOOK:SUBSCRIPTION] Updated subscription ${subscription.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[WEBHOOK:SUBSCRIPTION] Subscription deleted: ${subscription.id}`);

        const supabase = await createClient();

        // Mark subscription as canceled
        const { error: updateError } = await supabase
          .from('organisation_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('[WEBHOOK:SUBSCRIPTION] Failed to mark subscription as canceled:', updateError);
          throw updateError;
        }

        console.log(`[WEBHOOK:SUBSCRIPTION] Marked subscription ${subscription.id} as canceled`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[WEBHOOK:SUBSCRIPTION] Invoice payment succeeded: ${invoice.id}`);

        // Check if this is a subscription invoice
        if (!(invoice as any).subscription) {
          console.log('[WEBHOOK:SUBSCRIPTION] Invoice is not for a subscription, skipping');
          break;
        }

        const supabase = await createClient();

        // Ensure subscription status is 'active' (trial → active conversion)
        const { error: updateError } = await supabase
          .from('organisation_subscriptions')
          .update({
            status: 'active',
          })
          .eq('stripe_subscription_id', (invoice as any).subscription as string)
          .in('status', ['trialing', 'past_due']); // Only update if trialing or recovering from past_due

        if (updateError) {
          console.error('[WEBHOOK:SUBSCRIPTION] Failed to update subscription to active:', updateError);
          // Non-critical - subscription.updated event will also sync status
        }

        console.log(`[WEBHOOK:SUBSCRIPTION] Confirmed subscription ${(invoice as any).subscription} is active`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.error(`[WEBHOOK:SUBSCRIPTION] Invoice payment failed: ${invoice.id}`);

        // Check if this is a subscription invoice
        if (!(invoice as any).subscription) {
          console.log('[WEBHOOK:SUBSCRIPTION] Invoice is not for a subscription, skipping');
          break;
        }

        const supabase = await createClient();

        // Update subscription status to 'past_due'
        const { error: updateError } = await supabase
          .from('organisation_subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('stripe_subscription_id', (invoice as any).subscription as string);

        if (updateError) {
          console.error('[WEBHOOK:SUBSCRIPTION] Failed to update subscription to past_due:', updateError);
          throw updateError;
        }

        console.log(`[WEBHOOK:SUBSCRIPTION] Marked subscription ${(invoice as any).subscription} as past_due`);

        // TODO: Send email notification to organisation owner about failed payment
        // Can be implemented later with email service integration

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
