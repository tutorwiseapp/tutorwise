/*
 * Filename: src/app/api/stripe/set-default-card/route.ts
 * Purpose: Securely sets a user's default payment method in Stripe.
 * Change History:
 * C005 - 2025-09-02 : 20:00 - Migrated to use Supabase server client for authentication.
 * C004 - 2025-08-26 : 18:00 - Replaced Clerk auth with Kinde and Supabase.
 * Last Modified: 2025-09-02 : 20:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API has been fully migrated to Supabase Auth. It uses `createClient` to get the user and fetches the `stripe_customer_id` from the `profiles` table.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized: You must be logged in." }), { status: 401 });
    }

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return new NextResponse(JSON.stringify({ error: "Bad Request: Payment Method ID is required." }), { status: 400 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
      
    const stripeCustomerId = profile?.stripe_customer_id;
    if (!stripeCustomerId) {
        return new NextResponse(JSON.stringify({ error: "Stripe customer not found for this user." }), { status: 404 });
    }

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError ? `Stripe Error: ${error.message}` : "An internal server error occurred.";
    const status = error instanceof Stripe.errors.StripeInvalidRequestError ? 400 : 500;
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status });
  }
}