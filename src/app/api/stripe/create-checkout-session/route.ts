/*
 * Filename: src/app/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session, with robust "Find or Create" customer logic.
 * Change History:
 * C013 - 2025-09-03 : 16:00 - Definitive fix for missing Stripe customer on new user signup.
 * Last Modified: 2025-09-03 : 16:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This API now contains the complete, definitive logic for integrating Supabase Auth with Stripe. It now performs a "Find or Create" operation for the Stripe Customer. If a user does not have a `stripe_customer_id` in their profile, this endpoint will create one in Stripe and save the new ID back to the Supabase `profiles` table before proceeding. This permanently fixes the "Create New Card" button for new users.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // 1. Get the user's profile from our database.
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, display_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found.');
    }

    let stripeCustomerId = profile.stripe_customer_id;
    
    // 2. --- THIS IS THE DEFINITIVE FIX ---
    // If the user does NOT have a Stripe ID, create one for them now.
    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        name: profile.display_name,
        metadata: { supabaseId: user.id }
      });
      stripeCustomerId = newCustomer.id;

      // Save the new Stripe Customer ID back to our database for future use.
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // 3. Proceed with creating the Checkout Session.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payments?status=success&customer_id=${stripeCustomerId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error("[API/create-checkout-session] CRITICAL ERROR:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError ? `Stripe Error: ${error.message}` : "An internal server error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}