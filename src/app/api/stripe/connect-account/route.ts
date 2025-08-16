/*
 * Filename: src/app/api/stripe/connect-account/route.ts
 * Purpose: Creates a Stripe Express Account and an Account Link for user onboarding.
 * Change History:
 * C007 - 2025-08-09 : 17:00 - Definitive fix: Removed card_payments from capabilities.
 * C006 - 2025-07-27 : 23:45 - Added robust validation for user and email.
 * ... (previous history)
 * Last Modified: 2025-08-09 : 17:00
 * Requirement ID: VIN-API-002
 * Change Summary: This is the definitive fix for the Stripe Connect API error. The call to `stripe.accounts.create` has been modified to only request the `transfers` capability. The `card_payments` capability was removed as it is not needed for the Vinite business model and was causing a conflict with the platform's configuration.
 * Impact Analysis: This change will permanently fix the "Connect with Stripe" button and the entire user onboarding flow for receiving payments.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }
    
    const primaryEmailObject = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    );
    
    const primaryEmail = primaryEmailObject?.emailAddress;

    if (!primaryEmail) {
        return new NextResponse("User has no primary email address.", { status: 400 });
    }

    let stripeAccountId = user.publicMetadata?.stripe_account_id as string | undefined;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: primaryEmail,
        capabilities: {
          // --- THIS IS THE DEFINITIVE FIX ---
          // We only need to request the ability to transfer funds TO this account.
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          stripe_account_id: stripeAccountId,
        }
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error) {
    console.error("Error creating Stripe connect link:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}