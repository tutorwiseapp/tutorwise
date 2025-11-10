/*
 * Filename: src/app/api/stripe/disconnect-account/route.ts
 * Purpose: Securely deletes a user's Stripe Connect account.
 * Change History:
 * C002 - 2025-09-02 : 20:00 - Migrated to use Supabase server client for authentication.
 * C001 - 2025-08-10 : 00:00 - Initial creation.
 * Last Modified: 2025-09-02 : 20:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API has been fully migrated to Supabase Auth. It uses the `createClient` to get the user and then reads/updates the `stripe_account_id` in the `profiles` table.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST() {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    const stripeAccountId = profile?.stripe_account_id;

    if (!stripeAccountId) {
      return new NextResponse(JSON.stringify({ error: "No Stripe account connected to this user." }), { status: 400 });
    }

    await stripe.accounts.del(stripeAccountId);

    await supabase
      .from('profiles')
      .update({ stripe_account_id: null })
      .eq('id', user.id);

    return NextResponse.json({ success: true, message: 'Stripe account disconnected successfully.' });
  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}