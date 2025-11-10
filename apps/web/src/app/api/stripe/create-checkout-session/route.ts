/*
 * Filename: src/app/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session, with robust "Find or Create" customer logic.
 * Change History:
 * C014 - 2025-09-03 : 17:00 - Definitive fix by deriving origin from request and adding customer_id to success_url.
 * C013 - 2025-09-03 : 16:00 - Added "Find or Create" Stripe customer logic.
 * Last Modified: 2025-09-03 : 17:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive and final version of this API endpoint. It incorporates the correct architectural pattern of deriving the `origin` from the incoming request (`req.url`) instead of relying on an environment variable. It also adds the `customer_id` to the `success_url`, which is a critical requirement for the frontend's polling and verification mechanism.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // --- YOUR CORRECT LOGIC ---
    // 1. Get the user's profile from our database.
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found.');
    }

    let stripeCustomerId = profile.stripe_customer_id;
    
    // 2. If the user does NOT have a Stripe ID, create one for them now.
    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        name: profile.full_name,
        metadata: { supabaseId: user.id }
      });
      stripeCustomerId = newCustomer.id;

      // Save the new Stripe Customer ID back to our database.
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // --- YOUR CORRECT ARCHITECTURAL FIX ---
    // Get the origin URL directly from the request object for reliability.
    const origin = new URL(req.url).origin;

    // 3. Proceed with creating the Checkout Session.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      // --- THE FINAL IMPROVEMENT ---
      // Add the customer_id to the success_url for the frontend polling mechanism.
      success_url: `${origin}/payments?status=success&customer_id=${stripeCustomerId}`,
      cancel_url: `${origin}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError 
        ? `Stripe Error: ${error.message}` 
        : "An internal server error occurred.";
    console.error("Error creating Stripe session:", error);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}