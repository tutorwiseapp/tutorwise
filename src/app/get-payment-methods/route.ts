/*
 * Filename: src/app/api/stripe/get-payment-methods/route.ts
 * Purpose: Provides a secure API to fetch a user's saved payment methods, migrated to Kinde.
 * Change History:
 * C006 - 2025-08-26 : 19:00 - Replaced Clerk auth with Kinde's sessionManager and Supabase.
 * C005 - 2025-08-21 : 23:00 - Definitive and final fix for a critical variable typo.
 * Last Modified: 2025-08-26 : 19:00
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This API has been migrated from Clerk to Kinde. It now uses the `sessionManager` for authentication. The logic to "Trust, but Verify" the Stripe Customer ID has been preserved, but it now self-heals our Supabase `profiles` table instead of Clerk's metadata. This resolves the final server-side build error.
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

export async function GET() {
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
      return NextResponse.json({ cards: [], defaultPaymentMethodId: null });
    }
    
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({ cards: [], defaultPaymentMethodId: null });
    }
    
    const stripeCustomer = customers.data[0];

    // --- THIS IS THE FIX: Self-heal our own database if needed ---
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();
        
    if (profile && profile.stripe_customer_id !== stripeCustomer.id) {
        console.warn(`[API/get-payment-methods] Data inconsistency. Self-healing Supabase for user ${user.id}.`);
        await supabaseAdmin
            .from('profiles')
            .update({ stripe_customer_id: stripeCustomer.id })
            .eq('id', user.id);
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomer.id,
      type: 'card',
    });

    const savedCards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }));

    return NextResponse.json({ 
        cards: savedCards, 
        defaultPaymentMethodId: (stripeCustomer as Stripe.Customer).invoice_settings?.default_payment_method 
    });

  } catch (error) {
    console.error("[API/get-payment-methods] CRITICAL ERROR:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}