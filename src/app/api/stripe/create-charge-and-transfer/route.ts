/*
 * Filename: src/app/api/stripe/create-charge-and-transfer/route.ts
 * Purpose: Implements the 'Separate Charges and Transfers' flow, migrated to Kinde.
 * Change History:
 * C002 - 2025-08-26 : 18:00 - Replaced Clerk auth with Kinde and Supabase lookup.
 * C001 - 2025-07-28 : 00:30 - Initial creation.
 * Last Modified: 2025-08-26 : 18:00
 * Requirement ID: VIN-AUTH-MIG-03
 * Change Summary: This API has been migrated from Clerk to Kinde. It now uses `sessionManager` for authentication. The user's Stripe Customer ID is now fetched from our Supabase `profiles` table instead of Clerk's metadata, making our database the source of truth and resolving the build error.
 */
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/kinde'; // --- THIS IS THE FIX ---
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js'; // --- THIS IS THE FIX ---

// --- THIS IS THE FIX: Initialize Supabase admin client ---
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { getUser, isAuthenticated } = sessionManager(); // --- THIS IS THE FIX ---
    if (!(await isAuthenticated())) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const user = await getUser();
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const { amount, currency, destinationAccountId, paymentMethodId } = await req.json();

    if (!amount || !currency || !destinationAccountId || !paymentMethodId) {
        return new NextResponse(JSON.stringify({ error: "Missing required transaction details." }), { status: 400 });
    }

    // --- THIS IS THE FIX: Retrieve the Seeker's Stripe Customer ID from our Supabase 'profiles' table ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id') // We need to ensure this column exists
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile?.stripe_customer_id) {
        throw new Error("User does not have a saved payment method.");
    }
    const stripeCustomerId = profile.stripe_customer_id;

    const applicationFee = Math.floor(amount * 0.123);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: destinationAccountId,
      },
    });
    
    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });

  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError
        ? error.message
        : "An unknown error occurred.";
    
    console.error("Error creating charge and transfer:", error);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}