/*
 * Filename: src/app/api/stripe/get-connect-account/route.ts
 * Purpose: Retrieves the authenticated user's Stripe Connect account status.
 * Change History:
 * C002 - 2025-07-31 : 13:00 - Migrate to Kinde.
 * C001 - 2025-07-27 : 23:45 - Initial creation.
 * Last Modified: 2025-07-27 : 23:45
 * Requirement ID: VIN-API-006
 * Change Summary: This new API route provides the frontend with a secure way to fetch the details
 * of a user's Stripe Connect account. It retrieves the account ID from Clerk metadata and
 * uses the Stripe Node SDK to get the latest account details, such as `details_submitted`.
 * Impact Analysis: This is a critical backend component for the payments page, allowing it
 * to display the correct "Connected" or "Not Connected" status and fixing a 404 error.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/kinde';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { getUser, isAuthenticated } = sessionManager();
    if (!(await isAuthenticated())) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const user = await getUser();
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
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
    console.error("Error retrieving Stripe Connect account:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}