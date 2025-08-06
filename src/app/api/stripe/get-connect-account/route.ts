/*
 * Filename: src/app/api/stripe/get-connect-account/route.ts
 * Purpose: Retrieves the authenticated user's Stripe Connect account status.
 * Change History:
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
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const stripeAccountId = user.publicMetadata?.stripe_account_id as string | undefined;

    // If the user has no Stripe Connect account ID, it's not an error.
    // They simply haven't connected yet. Return null.
    if (!stripeAccountId) {
      return NextResponse.json({ account: null });
    }

    // Retrieve the full account details from Stripe to get the latest status.
    const account = await stripe.accounts.retrieve(stripeAccountId);

    return NextResponse.json({ account });

  } catch (error) {
    console.error("Error retrieving Stripe Connect account:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}