/*
 * Filename: src/app/api/stripe/create-charge-and-transfer/route.ts
 * Purpose: Implements the 'Separate Charges and Transfers' flow.
 * Change History:
 * C003 - 2025-09-02 : 19:00 - Migrated to use Supabase server client for authentication.
 * Last Modified: 2025-09-02 : 19:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API has been fully migrated to Supabase Auth. It now uses the `createClient` from `@/utils/supabase/server` to securely get the user's session and profile data.
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
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { amount, currency, destinationAccountId, paymentMethodId } = await req.json();
    if (!amount || !currency || !destinationAccountId || !paymentMethodId) {
        return new NextResponse(JSON.stringify({ error: "Missing required transaction details." }), { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile?.stripe_customer_id) {
        throw new Error("User does not have a saved payment method.");
    }
    const stripeCustomerId = profile.stripe_customer_id;

    const applicationFee = Math.floor(amount * 0.123);

    const paymentIntent = await stripe.paymentIntents.create({
      amount, currency, customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true, confirm: true,
      application_fee_amount: applicationFee,
      transfer_data: { destination: destinationAccountId },
    });
    
    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });
  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}