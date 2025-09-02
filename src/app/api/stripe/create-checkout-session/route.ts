/*
 * Filename: src/app/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session for saving a new payment method.
 * Change History:
 * C011 - 2025-09-02 : 20:00 - Migrated to use Supabase server client for authentication.
 * Last Modified: 2025-09-02 : 20:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API has been fully migrated to Supabase Auth. It uses the `createClient` from `@/utils/supabase/server` to securely get the user's session and performs the Stripe "Find or Create" customer logic, updating the Supabase `profiles` table.
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

    const userEmail = user.email;
    if (!userEmail) {
        return new NextResponse(JSON.stringify({ error: "User has no primary email address." }), { status: 400 });
    }

    let stripeCustomerId: string;
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length > 0) {
      stripeCustomerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        name: user.user_metadata.full_name || userEmail,
        metadata: { supabaseId: user.id }
      });
      stripeCustomerId = newCustomer.id;
    }

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success&customer_id=${stripeCustomerId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError ? `Stripe Error: ${error.message}` : "An internal server error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}