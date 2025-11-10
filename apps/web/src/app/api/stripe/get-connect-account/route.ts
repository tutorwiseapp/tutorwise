/*
 * Filename: src/app/api/stripe/get-connect-account/route.ts
 * Purpose: Retrieves the authenticated user's Stripe Connect account status.
 * Change History:
 * C002 - 2025-09-02 : 20:00 - Migrated to use Supabase server client for authentication.
 * C001 - 2025-07-27 : 23:45 - Initial creation.
 * Last Modified: 2025-09-02 : 20:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API has been fully migrated to Supabase Auth. It uses the `createClient` to get the user and then fetches the `stripe_account_id` from the `profiles` table.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

export async function GET() {
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
      return NextResponse.json({ account: null });
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    return NextResponse.json({ account });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}