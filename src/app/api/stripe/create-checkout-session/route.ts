/*
 * Filename: src/app/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session for saving a new payment method, migrated to Kinde.
 * Change History:
 * C010 - 2025-08-26 : 18:00 - Replaced Clerk auth with Kinde and Supabase.
 * C009 - 2025-08-21 : 21:00 - Finalized documentation and confirmed robustness.
 * Last Modified: 2025-08-26 : 18:00
 * Requirement ID: VIN-AUTH-MIG-03
 * Change Summary: This API has been migrated from Clerk to Kinde. It uses `sessionManager` for authentication. The "Find or Create" logic for Stripe Customers is preserved. Crucially, the step that updated Clerk's metadata has been replaced with an update to our Supabase `profiles` table to store the `stripe_customer_id`, resolving the build error.
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
        name: `${user.given_name || ''} ${user.family_name || ''}`.trim(),
        metadata: { kindeId: user.id } // Swapped clerkId for kindeId
      });
      stripeCustomerId = newCustomer.id;
    }

    // --- THIS IS THE FIX: Update our Supabase 'profiles' table ---
    await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${process.env.KINDE_SITE_URL}/payments?status=success&customer_id=${stripeCustomerId}`,
      cancel_url: `${process.env.KINDE_SITE_URL}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error("[API/create-checkout-session] CRITICAL ERROR:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError
      ? `Stripe Error: ${error.message}`
      : "An internal server error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}