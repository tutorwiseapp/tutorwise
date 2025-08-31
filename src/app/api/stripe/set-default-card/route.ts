/*
 * Filename: src/api/stripe/set-default-card/route.ts
 * Purpose: Securely sets a user's default payment method in Stripe, migrated to Kinde.
 * Change History:
 * C004 - 2025-08-26 : 18:00 - Replaced Clerk auth with Kinde's sessionManager and Supabase.
 * C003 - 2025-08-12 : 18:00 - Definitive fix with robust error handling.
 * C002 - 2025-08-10 : 04:00 - Definitive fix for async/await error.
 * C001 - 2025-08-10 : 03:00 - Initial creation.
 * Last Modified: 2025-08-26 : 18:00
 * Requirement ID: VIN-AUTH-MIG-03
 * Change Summary: This API has been migrated from Clerk to Kinde. It now uses `sessionManager` for authentication. The Stripe Customer ID is fetched from our Supabase `profiles` table instead of Clerk's metadata, making our database the source of truth and resolving the build error.
 */
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/kinde';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { getUser, isAuthenticated } = sessionManager();
    if (!(await isAuthenticated())) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized: You must be logged in." }), { status: 401 });
    }
    const user = await getUser();
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return new NextResponse(JSON.stringify({ error: "Bad Request: Payment Method ID is required." }), { status: 400 });
    }
    
    const { data: profile } = await supabaseAdmin
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
    console.error("[API/set-default-card] CRITICAL ERROR:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError 
        ? `Stripe Error: ${error.message}` 
        : "An internal server error occurred.";
    
    const status = error instanceof Stripe.errors.StripeInvalidRequestError ? 400 : 500;

    return new NextResponse(JSON.stringify({ error: errorMessage }), { status });
  }
}