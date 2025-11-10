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

    // 2. Parse request body
    const body = await req.json();
    const { booking_id } = body;

    if (!booking_id) {
      return new NextResponse(JSON.stringify({ error: "booking_id is required" }), { status: 400 });
    }

    // 3. Get booking details (migrations 049 & 051)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, client_id, amount, service_name, payment_status')
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

    // 7. Create Stripe Checkout Session (PAYMENT MODE)
    // (SDD v3.6, Section 8.6 - booking_id passed in metadata for webhook)
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
      metadata: {
        booking_id: booking_id, // CRITICAL: This is used by the webhook to find the booking
        supabase_user_id: user.id,
      },
      success_url: `${origin}/bookings?payment=success`,
      cancel_url: `${origin}/bookings?payment=cancel`,
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
