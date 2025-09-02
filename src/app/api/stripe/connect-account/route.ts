/*
 * Filename: src/app/api/stripe/connect-account/route.ts
 * Purpose: Creates a Stripe Express Account for a user.
 * Change History:
 * C011 - 2025-09-02 : 19:00 - Migrated to use Supabase server client for authentication.
 * Last Modified: 2025-09-02 : 19:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API has been fully migrated to Supabase Auth. It now uses the `createClient` from `@/utils/supabase/server` to securely get the user's session and profile data.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET() {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    
    const primaryEmail = user.email;
    if (!primaryEmail) {
        return new NextResponse("User has no primary email address.", { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    
    let stripeAccountId = profile?.stripe_account_id;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: primaryEmail,
        capabilities: { transfers: { requested: true } },
      });
      stripeAccountId = account.id;

      await supabase
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id);
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}