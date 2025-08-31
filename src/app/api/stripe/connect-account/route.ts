/*
 * Filename: src/app/api/stripe/connect-account/route.ts
 * Purpose: Creates a Stripe Express Account, migrated to Kinde.
 * Change History:
 * C010 - 2025-08-26 : 18:00 - Replaced Clerk auth with Kinde's sessionManager and Supabase for data storage.
 * Last Modified: 2025-08-26 : 18:00
 * Requirement ID: VIN-AUTH-MIG-03
 * Change Summary: This API has been migrated from Clerk to Kinde. It now uses the `sessionManager` for authentication. Instead of reading/writing to Clerk's metadata, it now reads the `stripe_account_id` from our Supabase `profiles` table and updates it there after creating a new Stripe account. This makes our database the source of truth and resolves the build error.
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
    
    const primaryEmail = user.email;
    if (!primaryEmail) {
        return new NextResponse("User has no primary email address.", { status: 400 });
    }

    // --- THIS IS THE FIX: Get stripe_account_id from our Supabase 'profiles' table ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    
    let stripeAccountId = profile?.stripe_account_id;

    if (!stripeAccountId) {
      console.log(`[Stripe Connect] No account found for user ${user.id}. Creating new account.`);
      const account = await stripe.accounts.create({
        type: 'express',
        email: primaryEmail,
        capabilities: {
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;

      // --- THIS IS THE FIX: Update our 'profiles' table, not Kinde metadata ---
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id);

      console.log(`[Stripe Connect] New account created: ${stripeAccountId} for user ${user.id}.`);
    } else {
      console.log(`[Stripe Connect] Found existing account: ${stripeAccountId} for user ${user.id}.`);
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.KINDE_SITE_URL}/payments`,
      return_url: `${process.env.KINDE_SITE_URL}/payments`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error) {
    console.error("[Stripe Connect] CRITICAL ERROR:", error);
    let errorMessage = "An unknown server error occurred.";
    if (error instanceof Stripe.errors.StripeError) {
        errorMessage = `Stripe Error: ${error.message}`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}