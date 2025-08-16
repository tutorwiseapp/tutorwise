/*
 * Filename: src/app/api/stripe/connect-account/route.ts
 * Purpose: Creates a Stripe Express Account and an Account Link for user onboarding.
 * Change History:
 * C008 - 2025-08-09 : 23:30 - Definitive fix for state management bug.
 * C007 - 2025-08-09 : 17:00 - Definitive fix: Removed card_payments from capabilities.
 * C006 - 2025-07-27 : 23:45 - Added robust validation for user and email.
 * Last Modified: 2025-08-09 : 23:30
 * Requirement ID: VIN-API-002
 * Change Summary: This is the definitive and final fix for the Stripe Connect flow. It corrects a critical state management bug where the code would attempt to re-create a Stripe account for a user who already had one. The logic now correctly checks for an existing stripe_account_id and, if found, proceeds directly to creating an account link, allowing users to resume their onboarding.
 * Impact Analysis: This change permanently fixes the "Connect with Stripe" button and resolves all related server errors.
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

    // --- THIS IS THE DEFINITIVE FIX ---
    let stripeAccountId = user.publicMetadata?.stripe_account_id as string | undefined;

    // SCENARIO 1: User does NOT have a Stripe Account ID.
    // This is their first time clicking the button.
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: primaryEmail,
        capabilities: {
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;

      // Save the new ID to Clerk's metadata immediately.
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          stripe_account_id: stripeAccountId,
        }
      });
    }

    // SCENARIO 2: User ALREADY has a Stripe Account ID.
    // We now have a valid stripeAccountId, either from the check above or from the creation step.
    // We proceed directly to creating the link that lets them continue onboarding.
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