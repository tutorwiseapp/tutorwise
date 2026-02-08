/*
 * Filename: src/app/api/stripe/create-booking-checkout/route.ts
 * Purpose: Creates a Stripe Checkout Session for booking payments (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 8.6, Q&A #3
 * Change Summary: New endpoint for booking checkout flow with booking_id in metadata
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { checkRateLimit, rateLimitError, rateLimitHeaders } from '@/middleware/rateLimiting';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/create-booking-checkout
 * Creates a Stripe Checkout Session for a booking payment
 * Body: { booking_id: string }
 * Returns: { sessionId: string, url: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // 1a. Rate limit check (security: prevent checkout spam)
    const rateLimitResult = await checkRateLimit(user.id, 'payment:checkout_create');
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
    const body = await req.json();
    const { booking_id } = body;

    if (!booking_id) {
      return new NextResponse(JSON.stringify({ error: "booking_id is required" }), { status: 400 });
    }

    // 3. Get booking details with tutor's Stripe account (for transfer_data)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        client_id,
        tutor_id,
        amount,
        service_name,
        payment_status,
        tutor:profiles!bookings_tutor_id_fkey(stripe_account_id)
      `)
      .eq('id', booking_id)
      .eq('client_id', user.id) // Ensure user owns this booking (migration 049)
      .single();

    if (bookingError || !booking) {
      return new NextResponse(JSON.stringify({ error: "Booking not found" }), { status: 404 });
    }

    if (booking.payment_status !== 'Pending') {
      return new NextResponse(JSON.stringify({ error: "Booking already processed" }), { status: 400 });
    }

    // 4. Get user's profile (for Stripe customer)
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    let stripeCustomerId = profile.stripe_customer_id;

    // 5. Find or create Stripe customer
    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        name: profile.full_name,
        metadata: { supabaseId: user.id }
      });
      stripeCustomerId = newCustomer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // 6. Get origin for redirect URLs
    const origin = new URL(req.url).origin;

    // 6a. v5.7: Check for wiselist referrer cookie
    const wiselistReferrerId = req.cookies.get('wiselist_referrer_id')?.value;

    // 7. Create Stripe Checkout Session (PAYMENT MODE)
    // (SDD v3.6, Section 8.6 - booking_id passed in metadata for webhook)
    const sessionMetadata: Record<string, string> = {
      booking_id: booking_id, // CRITICAL: This is used by the webhook to find the booking
      supabase_user_id: user.id,
      tutor_id: booking.tutor_id,
      client_id: booking.client_id,
    };

    // v5.7: Add wiselist referrer for attribution tracking
    if (wiselistReferrerId) {
      sessionMetadata.wiselist_referrer_id = wiselistReferrerId;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment', // PAYMENT mode (not setup)
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: booking.service_name,
              description: `Tutoring session: ${booking.service_name}`,
            },
            unit_amount: Math.round(booking.amount * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      metadata: sessionMetadata,
      success_url: `${origin}/bookings?payment=success`,
      cancel_url: `${origin}/bookings?payment=cancel`,
      // NEW: Unified commission handling via transfer_data (matches schedule/confirm flow)
      payment_intent_data: booking.tutor?.stripe_account_id
        ? {
            application_fee_amount: Math.round(booking.amount * 10), // 10% platform fee
            transfer_data: {
              destination: booking.tutor.stripe_account_id,
            },
          }
        : undefined,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url // Direct checkout URL
    });

  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError
      ? `Stripe Error: ${error.message}`
      : "An internal server error occurred.";
    console.error("Error creating booking checkout session:", error);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
